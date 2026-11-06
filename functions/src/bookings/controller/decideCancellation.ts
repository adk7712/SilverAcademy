import { AppError, type Booking, type Workshop } from '@silveracademy/shared';

/** Ownership first; a cancelled booking is a safe retry and never frees a second seat. */
export function decideCancellation(
  booking: Booking | undefined,
  workshop: Workshop | undefined,
  uid: string,
  now: Date,
): { changed: boolean; seatsTakenAfter: number } {
  if (!booking) throw new AppError('NOT_FOUND');
  if (booking.learnerId !== uid) throw new AppError('PERMISSION_DENIED');
  if (!workshop) throw new AppError('NOT_FOUND');
  if (booking.status === 'CANCELLED') {
    return { changed: false, seatsTakenAfter: workshop.seatsTaken };
  }
  if (booking.status !== 'CONFIRMED') throw new AppError('INVALID_TRANSITION');
  if (workshop.status !== 'OPEN') throw new AppError('WORKSHOP_NOT_OPEN');
  if (!workshop.startAt || workshop.startAt.toDate().getTime() <= now.getTime()) {
    throw new AppError('WORKSHOP_STARTED');
  }
  return { changed: true, seatsTakenAfter: Math.max(0, workshop.seatsTaken - 1) };
}
