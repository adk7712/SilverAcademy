// UC #1-2 CreateWorkshop: Admin SDK access for workshops-createWorkshop / updateWorkshop. Rules live in ../controller.
import { FieldValue, type Firestore } from 'firebase-admin/firestore';
import type { InstructorProfile, Workshop } from '@silveracademy/shared';
import { COL, runTx } from '../../common';
import {
  decideCreateWorkshop,
  decideUpdateWorkshop,
  type WorkshopPatch,
} from '../controller/decideWorkshop';
import type { CallableInputOf } from '../../common';

/** Creates a DRAFT workshop owned by `uid`. Reads the instructor profile in the same transaction. */
export function createWorkshopTx(
  db: Firestore,
  args: {
    uid: string;
    instructorName: string;
    input: CallableInputOf<'workshops-createWorkshop'>;
  },
): Promise<{ workshopId: string }> {
  const ref = db.collection(COL.workshops).doc();
  const profileRef = db.collection(COL.instructorProfiles).doc(args.uid);
  return runTx(db, async (tx) => {
    const profileSnap = await tx.get(profileRef);
    const profile = profileSnap.exists ? (profileSnap.data() as InstructorProfile) : undefined;
    const fields = decideCreateWorkshop(profile, args.input);
    tx.create(ref, {
      id: ref.id,
      instructorId: args.uid,
      instructorName: args.instructorName,
      ...fields,
      status: 'DRAFT',
      seatsTaken: 0,
      attendedCount: 0,
      volunteersAssigned: 0,
      activeVenueRequestId: null,
      slotId: null,
      startAt: null,
      endAt: null,
      venue: null,
      ratingSum: 0,
      ratingCount: 0,
      version: 1,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    return { workshopId: ref.id };
  });
}

/** Applies a patch to an own DRAFT workshop; bumps `version`. */
export function updateWorkshopTx(
  db: Firestore,
  args: { uid: string; workshopId: string; patch: WorkshopPatch },
): Promise<{ workshopId: string }> {
  const ref = db.collection(COL.workshops).doc(args.workshopId);
  return runTx(db, async (tx) => {
    const snap = await tx.get(ref);
    const workshop = snap.exists ? (snap.data() as Workshop) : undefined;
    const changes = decideUpdateWorkshop(workshop, args.patch, args.uid);
    tx.update(ref, {
      ...changes,
      version: (workshop?.version ?? 0) + 1,
      updatedAt: FieldValue.serverTimestamp(),
    });
    return { workshopId: args.workshopId };
  });
}
