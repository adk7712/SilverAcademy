// UC #2-2 BookWorkshops: pure booking decision (architecture.md 4.1). Check order is the contract.
import {
  AppError,
  type Booking,
  type Workshop,
  type WorkshopSnapshot,
} from '@silveracademy/shared';
import { ids } from '../../common';

export interface BookingDecision {
  bookingId: string;
  /** Stored on the booking (keeps the workshop's Timestamp objects). */
  workshopSnapshot: WorkshopSnapshot;
  seatsTakenAfter: number;
  seatsRemaining: number;
}

/**
 * Order: NOT_FOUND -> CANNOT_BOOK_OWN_WORKSHOP -> WORKSHOP_NOT_OPEN -> WORKSHOP_STARTED -> ALREADY_BOOKED
 * (any status, details `{ bookingId }`) -> WORKSHOP_FULL. An OPEN workshop without schedule/venue
 * (inconsistent data) is treated as not bookable: WORKSHOP_NOT_OPEN.
 */
export function decideBooking(
  workshopId: string,
  workshop: Workshop | undefined,
  existing: Booking | undefined,
  uid: string,
  now: Date,
): BookingDecision {
  if (!workshop) throw new AppError('NOT_FOUND');
  if (workshop.instructorId === uid) throw new AppError('CANNOT_BOOK_OWN_WORKSHOP');
  const { startAt, endAt, venue } = workshop;
  if (workshop.status !== 'OPEN' || !startAt || !endAt || !venue) {
    throw new AppError('WORKSHOP_NOT_OPEN');
  }
  if (startAt.toDate().getTime() <= now.getTime()) throw new AppError('WORKSHOP_STARTED');
  const bookingId = ids.booking(workshopId, uid);
  if (existing) throw new AppError('ALREADY_BOOKED', undefined, { bookingId });
  if (workshop.seatsTaken >= workshop.capacity) throw new AppError('WORKSHOP_FULL');

  const seatsTakenAfter = workshop.seatsTaken + 1;
  return {
    bookingId,
    workshopSnapshot: {
      title: workshop.title,
      startAt,
      endAt,
      venueName: venue.name,
      venueAddress: venue.address,
      instructorName: workshop.instructorName,
    },
    seatsTakenAfter,
    seatsRemaining: workshop.capacity - seatsTakenAfter,
  };
}

/** Callable output shape of the snapshot (ISO times). */
export const snapshotToIso = (s: WorkshopSnapshot) => ({
  title: s.title,
  startAt: s.startAt.toDate().toISOString(),
  endAt: s.endAt.toDate().toISOString(),
  venueName: s.venueName,
  venueAddress: s.venueAddress,
  instructorName: s.instructorName,
});
