// UC #4-1 #4-2 error handling: readable messages, SLOT_CONFLICT detection, session-expiry detection.
import { toAppError, errorMessage } from '../../../services/errors';
import { venueStrings } from '../strings';

export const isSlotConflict = (e: unknown): boolean => toAppError(e).code === 'SLOT_CONFLICT';

const OVERRIDES: Record<string, string> = {
  SLOT_CONFLICT: venueStrings.errors.slotConflict,
  SLOT_BOOKED_LOCKED: venueStrings.errors.slotBookedLocked,
  SLOT_OVERLAP: venueStrings.errors.slotOverlap,
  REQUEST_NOT_PENDING: venueStrings.errors.requestNotPending,
  NOT_FACILITY_OWNER: venueStrings.errors.notOwner,
};

export function venueErrorMessage(e: unknown): string {
  const code = toAppError(e).code;
  return OVERRIDES[code] ?? errorMessage(e);
}
