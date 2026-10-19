// UC #4-2 ProcessVenueRequest: the approval transaction with slot locking (architecture 4.6, ADR-015).
import { FieldValue, Timestamp, type Firestore } from 'firebase-admin/firestore';
import type {
  Facility,
  TimeSlot,
  VenueRequest,
  VenueRequestStatus,
  Workshop,
} from '@silveracademy/shared';
import { COL, notifyTx, refs, runTx } from '../../common';
import { OPEN_REQUEST_STATUSES } from '../controller/conflicts';
import {
  decideVenueDecision,
  type DecisionInput,
  type DecisionSnapshot,
} from '../controller/decideVenueDecision';
import { writeConflicts } from './conflictsRepo';

const data = <T>(snap: { exists: boolean; data(): unknown }): T | undefined =>
  snap.exists ? (snap.data() as T) : undefined;

export interface DecisionResult {
  status: VenueRequestStatus;
  workshopId: string;
  conflictedRequestIds: string[];
}

/**
 * One transaction: reads request, workshop, slot, facility (+ competing open requests and their workshops for APPROVE),
 * decides, then writes. APPROVE locks the slot (BOOKED), opens the workshop and marks competitors CONFLICTED atomically.
 * The conflict path commits request CONFLICTED and returns status CONFLICTED (the handler throws SLOT_CONFLICT).
 */
export function decideVenueRequestTx(
  db: Firestore,
  args: { uid: string; requestId: string; input: DecisionInput; now: Date },
): Promise<DecisionResult> {
  const requestRef = db.collection(COL.venueRequests).doc(args.requestId);
  return runTx(db, async (tx) => {
    const request = data<VenueRequest>(await tx.get(requestRef));
    const workshopRef = request ? db.collection(COL.workshops).doc(request.workshopId) : undefined;
    const slotRef = request ? refs.slots(db, request.facilityId).doc(request.slotId) : undefined;
    const facilityRef = request ? db.collection(COL.facilities).doc(request.facilityId) : undefined;
    const workshop = workshopRef ? data<Workshop>(await tx.get(workshopRef)) : undefined;
    const slot = slotRef ? data<TimeSlot>(await tx.get(slotRef)) : undefined;
    const facility = facilityRef ? data<Facility>(await tx.get(facilityRef)) : undefined;
    const competitors: DecisionSnapshot['competitors'] = [];
    if (request && args.input.decision === 'APPROVE') {
      const q = db
        .collection(COL.venueRequests)
        .where('slotId', '==', request.slotId)
        .where('status', 'in', [...OPEN_REQUEST_STATUSES]);
      const others = (await tx.get(q)).docs
        .map((d) => d.data() as VenueRequest)
        .filter((r) => r.id !== request.id);
      const snaps = others.length
        ? await tx.getAll(...others.map((r) => db.collection(COL.workshops).doc(r.workshopId)))
        : [];
      others.forEach((r, i) =>
        competitors.push({ request: r, workshop: data<Workshop>(snaps[i]!) }),
      );
    }
    const plan = decideVenueDecision(
      { request, workshop, slot, facility, competitors },
      args.input,
      args.uid,
      args.now,
    );
    if (!request || !workshopRef || !slotRef) throw new Error('unreachable: decide checked');
    const touch = { updatedAt: FieldValue.serverTimestamp() };
    const decidedAt = Timestamp.fromDate(args.now);
    const resetWorkshop = (reset: boolean) => {
      if (!reset || !workshop) return;
      tx.update(workshopRef, {
        status: 'DRAFT',
        activeVenueRequestId: null,
        version: workshop.version + 1,
        ...touch,
      });
    };
    let conflictedRequestIds: string[] = [];

    switch (plan.outcome) {
      case 'REJECTED':
        tx.update(requestRef, {
          status: 'REJECTED',
          ...(plan.reason ? { decisionReason: plan.reason } : {}),
          decidedAt,
          decidedBy: args.uid,
          ...touch,
        });
        resetWorkshop(plan.resetWorkshop);
        break;
      case 'AWAITING_INFO':
        tx.update(requestRef, { status: 'AWAITING_INFO', infoRequest: plan.infoRequest, ...touch });
        break;
      case 'CONFLICTED':
        tx.update(requestRef, {
          status: 'CONFLICTED',
          decisionReason: plan.reason,
          ...(plan.suggestedSlotId ? { suggestedSlotId: plan.suggestedSlotId } : {}),
          decidedAt,
          decidedBy: args.uid,
          ...touch,
        });
        resetWorkshop(plan.resetWorkshop);
        break;
      case 'APPROVED': {
        if (!workshop || !facility || !slot) throw new Error('unreachable: approve checked');
        tx.update(requestRef, { status: 'APPROVED', decidedAt, decidedBy: args.uid, ...touch });
        tx.update(slotRef, {
          status: 'BOOKED',
          bookedWorkshopId: request.workshopId,
          bookedRequestId: request.id,
          ...touch,
        });
        tx.update(workshopRef, {
          status: 'OPEN',
          slotId: request.slotId,
          startAt: slot.startAt,
          endAt: slot.endAt,
          venue: {
            facilityId: facility.id,
            name: facility.name,
            address: facility.address,
            postalCode: facility.postalCode,
            lat: facility.lat,
            lng: facility.lng,
            partnerId: facility.partnerId,
          },
          activeVenueRequestId: null,
          version: workshop.version + 1,
          ...touch,
        });
        const reason = 'another workshop was approved for that slot';
        const items = competitors.map((c) => ({ request: c.request, workshop: c.workshop }));
        conflictedRequestIds = writeConflicts(db, tx, items, plan.competitors, reason);
        break;
      }
    }
    notifyTx(db, tx, plan.notice);
    return { status: plan.outcome, workshopId: request.workshopId, conflictedRequestIds };
  });
}
