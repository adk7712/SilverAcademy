// UC #4-1 ManageAvailability: Admin SDK transactions for venues-upsertSlot / venues-deleteSlot. Rules live in ../controller.
import { FieldValue, Timestamp, type Firestore } from 'firebase-admin/firestore';
import { MAX_SLOT_HOURS, type Facility, type TimeSlot } from '@silveracademy/shared';
import { COL, refs, runTx } from '../../common';
import type { CallableInputOf } from '../../common';
import { planConflicts } from '../controller/conflicts';
import { decideDeleteSlot, decideUpsertSlot } from '../controller/decideSlot';
import { readOpenRequestsOnSlot, writeConflicts } from './conflictsRepo';

const MS_PER_HOUR = 3_600_000;
const SLOT_MOVED_REASON = 'the partner changed or removed the slot';

/** Slots that can overlap [start, end): any overlapping slot starts within MAX_SLOT_HOURS before `start`. */
const siblingQuery = (db: Firestore, facilityId: string, start: Date, end: Date) =>
  refs
    .slots(db, facilityId)
    .where('startAt', '>', Timestamp.fromMillis(start.getTime() - MAX_SLOT_HOURS * MS_PER_HOUR))
    .where('startAt', '<', Timestamp.fromDate(end));

export function upsertSlotTx(
  db: Firestore,
  args: { uid: string; input: CallableInputOf<'venues-upsertSlot'>; now: Date },
): Promise<{ slotId: string; conflictedRequestIds: string[] }> {
  const { facilityId, slotId, startAt, endAt, status } = args.input;
  const facilityRef = db.collection(COL.facilities).doc(facilityId);
  const slotRef = slotId
    ? refs.slots(db, facilityId).doc(slotId)
    : refs.slots(db, facilityId).doc();
  const start = new Date(startAt);
  const end = new Date(endAt);
  return runTx(db, async (tx) => {
    const facilitySnap = await tx.get(facilityRef);
    const slotSnap = slotId ? await tx.get(slotRef) : undefined;
    // Only run range queries when the range is sane; decideUpsertSlot rejects the rest.
    const rangeOk = end > start;
    const siblings = rangeOk ? (await tx.get(siblingQuery(db, facilityId, start, end))).docs : [];
    const open = slotId ? await readOpenRequestsOnSlot(db, tx, slotId) : [];
    const decision = decideUpsertSlot({
      facility: facilitySnap.exists ? (facilitySnap.data() as Facility) : undefined,
      slotId,
      slot: slotSnap?.exists ? (slotSnap.data() as TimeSlot) : undefined,
      input: { startAt, endAt, status },
      siblings: siblings.map((d) => {
        const s = d.data();
        return { id: s.id, startAt: s.startAt.toDate(), endAt: s.endAt.toDate() };
      }),
      uid: args.uid,
      now: args.now,
    });
    const fields = {
      startAt: Timestamp.fromDate(decision.startAt),
      endAt: Timestamp.fromDate(decision.endAt),
      status: decision.status,
      updatedAt: FieldValue.serverTimestamp(),
    };
    if (slotId) tx.update(slotRef, fields);
    else {
      tx.create(slotRef, {
        id: slotRef.id,
        facilityId,
        partnerId: args.uid,
        ...fields,
        bookedWorkshopId: null,
        bookedRequestId: null,
        createdAt: FieldValue.serverTimestamp(),
      });
    }
    const plans = decision.conflictsRequests ? planConflicts(open, SLOT_MOVED_REASON) : [];
    const conflictedRequestIds = writeConflicts(db, tx, open, plans, SLOT_MOVED_REASON);
    return { slotId: slotRef.id, conflictedRequestIds };
  });
}

export function deleteSlotTx(
  db: Firestore,
  args: { uid: string; facilityId: string; slotId: string },
): Promise<{ conflictedRequestIds: string[] }> {
  const facilityRef = db.collection(COL.facilities).doc(args.facilityId);
  const slotRef = refs.slots(db, args.facilityId).doc(args.slotId);
  return runTx(db, async (tx) => {
    const [facilitySnap, slotSnap] = await Promise.all([tx.get(facilityRef), tx.get(slotRef)]);
    const open = await readOpenRequestsOnSlot(db, tx, args.slotId);
    decideDeleteSlot(
      facilitySnap.exists ? (facilitySnap.data() as Facility) : undefined,
      slotSnap.exists ? (slotSnap.data() as TimeSlot) : undefined,
      args.uid,
    );
    tx.delete(slotRef);
    const conflictedRequestIds = writeConflicts(
      db,
      tx,
      open,
      planConflicts(open, SLOT_MOVED_REASON),
      SLOT_MOVED_REASON,
    );
    return { conflictedRequestIds };
  });
}
