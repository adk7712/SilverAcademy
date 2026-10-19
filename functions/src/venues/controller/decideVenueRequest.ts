// UC #1-3 RequestVenue: pure rules for venues-requestVenue / respondToInfoRequest / withdrawVenueRequest. No Firebase imports.
import {
  AppError,
  MS_PER_MINUTE,
  VENUE_REQUEST_MIN_LEAD_MIN,
  type Facility,
  type InstructorProfile,
  type TimeSlot,
  type VenueRequest,
  type Workshop,
} from '@silveracademy/shared';
import { isOpenRequest } from './conflicts';

/**
 * Order (architecture 4.6): profile not APPROVED PROFILE_NOT_APPROVED -> workshop/facility/slot missing NOT_FOUND
 * -> not owner PERMISSION_DENIED -> active request or PENDING_VENUE VENUE_REQUEST_EXISTS -> status != DRAFT
 * WORKSHOP_NOT_EDITABLE -> slot not AVAILABLE SLOT_UNAVAILABLE -> slot starts within the lead time SLOT_IN_PAST
 * -> facility smaller than workshop VENUE_TOO_SMALL.
 */
export function decideRequestVenue(
  args: {
    profile: Pick<InstructorProfile, 'status'> | undefined;
    workshop:
      Pick<Workshop, 'instructorId' | 'status' | 'activeVenueRequestId' | 'capacity'> | undefined;
    facility: Pick<Facility, 'capacity'> | undefined;
    slot: Pick<TimeSlot, 'status' | 'startAt'> | undefined;
  },
  uid: string,
  now: Date,
): void {
  const { profile, workshop, facility, slot } = args;
  if (!profile || profile.status !== 'APPROVED') throw new AppError('PROFILE_NOT_APPROVED');
  if (!workshop || !facility || !slot) throw new AppError('NOT_FOUND');
  if (workshop.instructorId !== uid) throw new AppError('PERMISSION_DENIED');
  if (workshop.activeVenueRequestId !== null || workshop.status === 'PENDING_VENUE') {
    throw new AppError('VENUE_REQUEST_EXISTS');
  }
  if (workshop.status !== 'DRAFT') throw new AppError('WORKSHOP_NOT_EDITABLE');
  if (slot.status !== 'AVAILABLE') throw new AppError('SLOT_UNAVAILABLE');
  const earliest = now.getTime() + VENUE_REQUEST_MIN_LEAD_MIN * MS_PER_MINUTE;
  if (slot.startAt.toDate().getTime() <= earliest) throw new AppError('SLOT_IN_PAST');
  if (facility.capacity < workshop.capacity) throw new AppError('VENUE_TOO_SMALL');
}

type OwnRequest = Pick<VenueRequest, 'instructorId' | 'status'> | undefined;

/** Order: NOT_FOUND -> not the requesting instructor PERMISSION_DENIED -> status != AWAITING_INFO REQUEST_NOT_PENDING. */
export function decideRespondToInfo(request: OwnRequest, uid: string): void {
  if (!request) throw new AppError('NOT_FOUND');
  if (request.instructorId !== uid) throw new AppError('PERMISSION_DENIED');
  if (request.status !== 'AWAITING_INFO') throw new AppError('REQUEST_NOT_PENDING');
}

/** Order: NOT_FOUND -> PERMISSION_DENIED -> not PENDING / AWAITING_INFO REQUEST_NOT_PENDING. */
export function decideWithdrawRequest(request: OwnRequest, uid: string): void {
  if (!request) throw new AppError('NOT_FOUND');
  if (request.instructorId !== uid) throw new AppError('PERMISSION_DENIED');
  if (!isOpenRequest(request)) throw new AppError('REQUEST_NOT_PENDING');
}
