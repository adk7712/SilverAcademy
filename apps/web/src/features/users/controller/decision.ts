// UC #5-1 #5-5 shared submit flow: validate reason, call, classify failures for the ui.
import type { AppErrorCode } from '@silveracademy/shared';
import { errorMessage, isSessionError, toAppError } from '../../../services/errors';
import type { DecisionOutcome } from '../types';
import { checkReason } from './reason';

/** Errors after which the record on screen is out of date: reload it. */
const REFRESH_CODES: readonly AppErrorCode[] = [
  'STALE_VERSION',
  'NOT_FOUND',
  'INVALID_TRANSITION',
  'NOT_PENDING',
];
/** Errors that mean this admin's session is no longer valid. */

export function classifyFailure(e: unknown): Extract<DecisionOutcome<never>, { kind: 'failed' }> {
  const err = toAppError(e);
  return {
    kind: 'failed',
    message: errorMessage(err),
    refresh: REFRESH_CODES.includes(err.code),
    endSession: isSessionError(err),
  };
}

export async function submitWithReason<T>(opts: {
  reasonText: string;
  reasonRequired: boolean;
  call: (reason: string | undefined) => Promise<T>;
}): Promise<DecisionOutcome<T>> {
  const check = checkReason(opts.reasonText, opts.reasonRequired);
  if (!check.ok) return { kind: 'invalid', message: check.message };
  try {
    return { kind: 'done', value: await opts.call(check.reason) };
  } catch (e) {
    return classifyFailure(e);
  }
}
