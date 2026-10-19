// UC #4-1, #4-2 shared tx helpers: read open requests on a slot, write CONFLICTED outcomes (architecture 4.6).
import { FieldValue, type Firestore, type Transaction } from 'firebase-admin/firestore';
import type { VenueRequest, Workshop } from '@silveracademy/shared';
import { COL, notifyTx } from '../../common';
import { OPEN_REQUEST_STATUSES, type ConflictPlan } from '../controller/conflicts';

export interface OpenRequestOnSlot {
  request: VenueRequest;
  workshop: Workshop | undefined;
}

/** Tx reads (call before any write): PENDING / AWAITING_INFO requests for `slotId` and their workshops. */
export async function readOpenRequestsOnSlot(
  db: Firestore,
  tx: Transaction,
  slotId: string,
): Promise<OpenRequestOnSlot[]> {
  const q = db
    .collection(COL.venueRequests)
    .where('slotId', '==', slotId)
    .where('status', 'in', [...OPEN_REQUEST_STATUSES]);
  const requests = (await tx.get(q)).docs.map((d) => d.data() as VenueRequest);
  if (requests.length === 0) return [];
  const wRefs = requests.map((r) => db.collection(COL.workshops).doc(r.workshopId));
  const wSnaps = await tx.getAll(...wRefs);
  return requests.map((request, i) => ({
    request,
    workshop: wSnaps[i]?.exists ? (wSnaps[i].data() as Workshop) : undefined,
  }));
}

/** Tx writes: request -> CONFLICTED, workshop back to DRAFT when it waited on it, notify the instructor. */
export function writeConflicts(
  db: Firestore,
  tx: Transaction,
  items: OpenRequestOnSlot[],
  plans: ConflictPlan[],
  reason: string,
): string[] {
  for (const plan of plans) {
    tx.update(db.collection(COL.venueRequests).doc(plan.requestId), {
      status: 'CONFLICTED',
      decisionReason: reason,
      updatedAt: FieldValue.serverTimestamp(),
    });
    const workshop = items.find((i) => i.request.id === plan.requestId)?.workshop;
    if (plan.resetWorkshop && workshop) {
      tx.update(db.collection(COL.workshops).doc(plan.workshopId), {
        status: 'DRAFT',
        activeVenueRequestId: null,
        version: workshop.version + 1,
        updatedAt: FieldValue.serverTimestamp(),
      });
    }
    notifyTx(db, tx, { ...plan.notice, type: 'VENUE_REQUEST_CONFLICTED' });
  }
  return plans.map((p) => p.requestId);
}
