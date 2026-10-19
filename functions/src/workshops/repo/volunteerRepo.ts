// UC #3-2 AssistWorkshop: Admin SDK transactions for volunteer opt-in / withdraw (ADR-014). Rules live in ../controller.
import { FieldValue, type Firestore } from 'firebase-admin/firestore';
import type { VolunteerAssignment, Workshop } from '@silveracademy/shared';
import { COL, ids, runTx } from '../../common';
import { decideOptIn, decideWithdraw } from '../controller/decideVolunteer';

/** One tx: reads workshop + `${workshopId}_${uid}`, decides, writes ASSIGNED (set: reuses a WITHDRAWN doc) and +1 counter. */
export function optInTx(
  db: Firestore,
  args: { uid: string; volunteerName: string; workshopId: string; now: Date },
): Promise<{ assignmentId: string }> {
  const workshopRef = db.collection(COL.workshops).doc(args.workshopId);
  const assignmentId = ids.volunteerAssignment(args.workshopId, args.uid);
  const assignmentRef = db.collection(COL.volunteerAssignments).doc(assignmentId);
  return runTx(db, async (tx) => {
    const [wSnap, aSnap] = await Promise.all([tx.get(workshopRef), tx.get(assignmentRef)]);
    const workshop = wSnap.exists ? (wSnap.data() as Workshop) : undefined;
    const existing = aSnap.exists ? (aSnap.data() as VolunteerAssignment) : undefined;
    decideOptIn(workshop, existing, args.now);
    if (!workshop?.startAt) throw new Error('unreachable: decideOptIn guarantees startAt');
    tx.set(assignmentRef, {
      id: assignmentId,
      workshopId: args.workshopId,
      volunteerId: args.uid,
      volunteerName: args.volunteerName,
      workshopTitle: workshop.title,
      startAt: workshop.startAt,
      status: 'ASSIGNED',
      createdAt: existing?.createdAt ?? FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    tx.update(workshopRef, {
      volunteersAssigned: workshop.volunteersAssigned + 1,
      updatedAt: FieldValue.serverTimestamp(),
    });
    return { assignmentId };
  });
}

/** One tx: ASSIGNED -> WITHDRAWN and -1 counter, only before the workshop starts. */
export function withdrawTx(
  db: Firestore,
  args: { uid: string; workshopId: string; now: Date },
): Promise<void> {
  const workshopRef = db.collection(COL.workshops).doc(args.workshopId);
  const assignmentRef = db
    .collection(COL.volunteerAssignments)
    .doc(ids.volunteerAssignment(args.workshopId, args.uid));
  return runTx(db, async (tx) => {
    const [wSnap, aSnap] = await Promise.all([tx.get(workshopRef), tx.get(assignmentRef)]);
    const workshop = wSnap.exists ? (wSnap.data() as Workshop) : undefined;
    const assignment = aSnap.exists ? (aSnap.data() as VolunteerAssignment) : undefined;
    const next = decideWithdraw(assignment, workshop, args.now);
    tx.update(assignmentRef, { status: 'WITHDRAWN', updatedAt: FieldValue.serverTimestamp() });
    tx.update(workshopRef, {
      volunteersAssigned: next.volunteersAssigned,
      updatedAt: FieldValue.serverTimestamp(),
    });
  });
}
