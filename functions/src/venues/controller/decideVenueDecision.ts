// UC #4-2 ProcessVenueRequest: pure approve / reject / request-info rules with slot locking (ADR-015, architecture 4.6).
// No Firebase imports.
import {
  AppError,
  type Facility,
  type TimeSlot,
  type VenueDecision,
  type VenueRequest,
  type Workshop,
} from '@silveracademy/shared';
import { paths } from '../../common';
import { isOpenRequest, planConflicts, type ConflictPlan } from './conflicts';

export interface Notice {
  userId: string;
  type: 'VENUE_REQUEST_DECIDED' | 'VENUE_REQUEST_INFO' | 'VENUE_REQUEST_CONFLICTED';
  title: string;
  body: string;
  refPath: string;
}

export type VenueDecisionPlan =
  | { outcome: 'REJECTED'; resetWorkshop: boolean; reason?: string; notice: Notice }
  | { outcome: 'AWAITING_INFO'; infoRequest: string; notice: Notice }
  | {
      outcome: 'CONFLICTED';
      resetWorkshop: boolean;
      suggestedSlotId?: string;
      reason: string;
      notice: Notice;
    }
  | { outcome: 'APPROVED'; competitors: ConflictPlan[]; notice: Notice };

export interface DecisionSnapshot {
  request: VenueRequest | undefined;
  workshop: Workshop | undefined;
  slot: (Pick<TimeSlot, 'status'> & Partial<Pick<TimeSlot, 'startAt'>>) | undefined;
  facility: Facility | undefined;
  /** Other open requests on the same slot with their workshops (only read for APPROVE). */
  competitors: { request: VenueRequest; workshop: Workshop | undefined }[];
}

export interface DecisionInput {
  decision: VenueDecision;
  reason?: string | undefined;
  message?: string | undefined;
  suggestedSlotId?: string | undefined;
}

const SLOT_GONE_REASON = 'the slot was taken or withdrawn';
const SLOT_PAST_REASON = 'the slot start time has passed';
const VENUE_SMALL_REASON = 'the venue is smaller than the workshop capacity';

/**
 * Order: request missing NOT_FOUND -> partnerId != uid NOT_FACILITY_OWNER -> APPROVE of an already CONFLICTED
 * request SLOT_CONFLICT -> status not PENDING/AWAITING_INFO
 * REQUEST_NOT_PENDING -> REJECT | REQUEST_INFO (blank message REASON_REQUIRED) | APPROVE.
 * APPROVE with a slot that is not AVAILABLE, or a workshop no longer waiting on this request, is the conflict
 * path: it returns outcome CONFLICTED (the handler commits it, then throws SLOT_CONFLICT).
 */
export function decideVenueDecision(
  snap: DecisionSnapshot,
  input: DecisionInput,
  uid: string,
  now?: Date,
): VenueDecisionPlan {
  const { request, workshop } = snap;
  if (!request) throw new AppError('NOT_FOUND');
  if (request.partnerId !== uid) throw new AppError('NOT_FACILITY_OWNER');
  if (request.status === 'CONFLICTED' && input.decision === 'APPROVE') {
    // Lost the race: a concurrent approval already committed this request as CONFLICTED (nothing left to write).
    throw new AppError('SLOT_CONFLICT', undefined, { requestId: request.id });
  }
  if (!isOpenRequest(request)) throw new AppError('REQUEST_NOT_PENDING');
  const waiting = workshop?.activeVenueRequestId === request.id;
  const refPath = paths.venueRequest(request.id);
  const title = request.workshopSummary.title;

  if (input.decision === 'REJECT') {
    const reason = input.reason?.trim() || undefined;
    return {
      outcome: 'REJECTED',
      // Reset only a workshop still waiting in PENDING_VENUE; an ARCHIVED one must stay archived (review M4).
      resetWorkshop: waiting && workshop?.status === 'PENDING_VENUE',
      ...(reason ? { reason } : {}),
      notice: {
        userId: request.instructorId,
        type: 'VENUE_REQUEST_DECIDED',
        title: 'Venue request declined',
        body: `${request.facilityName} declined "${title}".${reason ? ` Reason: ${reason}` : ''}`,
        refPath,
      },
    };
  }
  if (input.decision === 'REQUEST_INFO') {
    const infoRequest = input.message?.trim();
    if (!infoRequest) throw new AppError('REASON_REQUIRED');
    return {
      outcome: 'AWAITING_INFO',
      infoRequest,
      notice: {
        userId: request.instructorId,
        type: 'VENUE_REQUEST_INFO',
        title: 'More information requested',
        body: `${request.facilityName} asks about "${title}": ${infoRequest}`,
        refPath,
      },
    };
  }

  const slotFree = snap.slot?.status === 'AVAILABLE';
  const slotStart = snap.slot?.startAt?.toDate().getTime();
  // L3: a late approval must not open a workshop whose slot already started, or a venue that no longer fits.
  const slotPassed = !!now && slotStart !== undefined && slotStart <= now.getTime();
  const tooSmall = !!snap.facility && !!workshop && snap.facility.capacity < workshop.capacity;
  const valid =
    slotFree &&
    !slotPassed &&
    !tooSmall &&
    !!workshop &&
    workshop.status === 'PENDING_VENUE' &&
    waiting;
  if (!valid) {
    return {
      outcome: 'CONFLICTED',
      resetWorkshop: waiting && workshop?.status === 'PENDING_VENUE',
      ...(input.suggestedSlotId ? { suggestedSlotId: input.suggestedSlotId } : {}),
      reason: slotPassed ? SLOT_PAST_REASON : tooSmall ? VENUE_SMALL_REASON : SLOT_GONE_REASON,
      notice: {
        userId: request.instructorId,
        type: 'VENUE_REQUEST_CONFLICTED',
        title: 'Venue slot conflict',
        body: `The slot for "${title}" at ${request.facilityName} is no longer available. Please pick another slot.`,
        refPath,
      },
    };
  }
  if (!snap.facility) throw new AppError('NOT_FOUND');
  const competitors = planConflicts(
    snap.competitors.filter((c) => c.request.id !== request.id),
    'another workshop was approved for that slot',
  );
  return {
    outcome: 'APPROVED',
    competitors,
    notice: {
      userId: request.instructorId,
      type: 'VENUE_REQUEST_DECIDED',
      title: 'Venue request approved',
      body: `${request.facilityName} approved "${title}". Your workshop is now open for booking.`,
      refPath,
    },
  };
}
