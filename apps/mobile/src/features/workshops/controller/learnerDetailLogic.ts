// UC #2-2 BookWorkshops: pure rules for the detail screen's Book button and booking error handling.
import { seatsRemaining, type Workshop } from '@silveracademy/shared';
import { strings } from '../../../i18n';
import { errorMessage } from '../../../services/errors/errorMessage';
import { toAppError } from '../../../services/errors/toAppError';

export type BookBlock = 'NOT_OPEN' | 'STARTED' | 'FULL';

/** Client-side hint only; the server transaction stays authoritative (functions bookings-bookWorkshop). */
export function bookBlockReason(
  w: Pick<Workshop, 'status' | 'startAt' | 'capacity' | 'seatsTaken'>,
  now: Date,
): BookBlock | null {
  if (w.status !== 'OPEN') return 'NOT_OPEN';
  if (!w.startAt || w.startAt.toDate().getTime() <= now.getTime()) return 'STARTED';
  if (seatsRemaining(w) === 0) return 'FULL';
  return null;
}

export const blockMessage = (b: BookBlock): string =>
  ({
    NOT_OPEN: strings.workshopsLearner.blockedNotOpen,
    STARTED: strings.workshopsLearner.blockedStarted,
    FULL: strings.workshopsLearner.blockedFull,
  })[b];

export interface BookFailure {
  message: string;
  /** Present for ALREADY_BOOKED so the UI can offer the existing ticket. */
  existingBookingId: string | null;
  /** Reload the workshop (seat count or status changed under the user). */
  refresh: boolean;
}

export function describeBookFailure(e: unknown): BookFailure {
  const err = toAppError(e);
  const raw = err.details?.bookingId;
  const refresh = ['WORKSHOP_FULL', 'WORKSHOP_NOT_OPEN', 'WORKSHOP_STARTED'].includes(err.code);
  return {
    message: errorMessage(err),
    existingBookingId: err.code === 'ALREADY_BOOKED' && typeof raw === 'string' ? raw : null,
    refresh,
  };
}
