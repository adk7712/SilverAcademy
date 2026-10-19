// UC #5-2 shared submit helpers: classify backend failures for the ui.
import { REASON_MAX } from '@silveracademy/shared';
import type { AppErrorCode } from '@silveracademy/shared';
import { errorMessage, fieldErrorsOf, isSessionError, toAppError } from '../../../services/errors';
import { workshopStrings as t } from '../strings';
import type { SubmitOutcome } from '../types';

const REFRESH_CODES: readonly AppErrorCode[] = [
  'STALE_VERSION',
  'NOT_FOUND',
  'INVALID_TRANSITION',
  'CAPACITY_BELOW_BOOKINGS',
  'WORKSHOP_LOCKED_FIELDS',
  'ACTIVE_BOOKINGS_CONFIRM_REQUIRED',
];

export function classifyFailure(e: unknown): Extract<SubmitOutcome<never>, { kind: 'failed' }> {
  const err = toAppError(e);
  return {
    kind: 'failed',
    message: errorMessage(err),
    fieldErrors: fieldErrorsOf(err),
    refresh: REFRESH_CODES.includes(err.code),
    endSession: isSessionError(err),
  };
}

export async function attempt<T>(call: () => Promise<T>): Promise<SubmitOutcome<T>> {
  try {
    return { kind: 'done', value: await call() };
  } catch (e) {
    return classifyFailure(e);
  }
}

export interface StatusFormCheck {
  reason?: string;
  errors: Record<string, string>;
}

/** Validates the cancel/archive dialog before anything is sent. */
export function checkStatusForm(opts: {
  reasonText: string;
  reasonRequired: boolean;
  impact: number;
  acknowledged: boolean;
}): StatusFormCheck {
  const errors: Record<string, string> = {};
  const reason = opts.reasonText.trim();
  if (!reason && opts.reasonRequired) errors.reason = t.confirm.reasonRequired;
  else if (reason.length > REASON_MAX) errors.reason = t.confirm.reasonTooLong(REASON_MAX);
  if (opts.impact > 0 && !opts.acknowledged) errors.ack = t.confirm.impactAckRequired;
  return { reason: reason || undefined, errors };
}
