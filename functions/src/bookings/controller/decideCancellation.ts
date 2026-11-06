import { AppError, type Booking, type Workshop } from '@silveracademy/shared';

/** Returns the new seat count, or null for an already-cancelled booking (no write). */
export function decideCancellation(
  booking: Booking | undefined,
  workshop: Workshop | undefined,
  uid: string,
  now: Date,
): number | null {
  if (!booking) throw new AppError('NOT_FOUND');
  if (booking.learnerId !== uid) throw new AppError('PERMISSION_DENIED');
  if (!workshop) throw new AppError('NOT_FOUND');
  if (booking.status === 'CANCELLED') return null;
  if (booking.status !== 'CONFIRMED') throw new AppError('INVALID_TRANSITION');
  if (workshop.status !== 'OPEN') throw new AppError('WORKSHOP_NOT_OPEN');
  if (!workshop.startAt || workshop.startAt.toDate().getTime() <= now.getTime()) {
    throw new AppError('WORKSHOP_STARTED');
  }
  return Math.max(0, workshop.seatsTaken - 1);
}
