// UC #1-4 #3-4 pure scan logic: QR pre-check, debounce gate, error classification, result state machine.
import { parseQrPayload, type AppError } from '@silveracademy/shared';
import { toAppError, isNetworkError } from '../../../services/errors/toAppError';
import type { ScanOutcome, ScanErrorKind, ScanSuccess } from '../types';

/** Same code seen again within this window is ignored (camera fires many frames per second). */
export const SAME_CODE_COOLDOWN_MS = 3000;
/** Successful check-ins return to scanning on their own; errors wait for a tap. */
export const SUCCESS_AUTO_RESET_MS = 2500;

/** Format check only; the server verifies the signature. */
export const isScannableQr = (raw: string): boolean => parseQrPayload(raw) !== null;

export interface ScanGate {
  lastValue: string | null;
  lastAt: number;
}
export const INITIAL_GATE: ScanGate = { lastValue: null, lastAt: 0 };

/** Accept a camera read unless the same value was already accepted within the cooldown. */
export function acceptScan(gate: ScanGate, value: string, now: number): ScanGate | null {
  if (value === gate.lastValue && now - gate.lastAt < SAME_CODE_COOLDOWN_MS) return null;
  return { lastValue: value, lastAt: now };
}

const KIND_BY_CODE: Partial<Record<AppError['code'], ScanErrorKind>> = {
  INVALID_QR: 'INVALID_QR',
  TICKET_NOT_FOUND: 'TICKET_NOT_FOUND',
  WRONG_WORKSHOP: 'WRONG_WORKSHOP',
  NO_BOOKING: 'NO_BOOKING',
  ALREADY_ATTENDED: 'ALREADY_ATTENDED',
  NOT_AUTHORISED_FOR_WORKSHOP: 'NOT_AUTHORISED',
  NOT_ASSIGNED: 'NOT_AUTHORISED',
  PERMISSION_DENIED: 'NOT_AUTHORISED',
  SESSION_NOT_ACTIVE: 'WINDOW_CLOSED',
  NOT_FOUND: 'WORKSHOP_NOT_FOUND',
};

const asString = (v: unknown): string | undefined => (typeof v === 'string' ? v : undefined);

export function outcomeFromError(error: unknown): ScanOutcome {
  const e = toAppError(error);
  if (isNetworkError(e)) return { status: 'error', kind: 'NETWORK', error: e };
  const kind = KIND_BY_CODE[e.code] ?? 'OTHER';
  return {
    status: 'error',
    kind,
    error: e,
    learnerName: asString(e.details?.learnerName),
    attendedAt: asString(e.details?.attendedAt),
  };
}

export const invalidQrOutcome = (): ScanOutcome => ({
  status: 'error',
  kind: 'INVALID_QR',
  error: undefined,
});

export const successOutcome = (r: Omit<ScanSuccess, 'status'>): ScanOutcome => ({
  status: 'success',
  ...r,
});

export type ScanState =
  { phase: 'scanning' } | { phase: 'submitting' } | { phase: 'result'; outcome: ScanOutcome };

export type ScanAction =
  { type: 'SUBMIT' } | { type: 'RESULT'; outcome: ScanOutcome } | { type: 'RESET' };

export const INITIAL_SCAN_STATE: ScanState = { phase: 'scanning' };

/** SUBMIT only starts from scanning (blocks double submits); RESULT only lands while submitting or scanning (pre-check). */
export function scanReducer(state: ScanState, action: ScanAction): ScanState {
  switch (action.type) {
    case 'SUBMIT':
      return state.phase === 'scanning' ? { phase: 'submitting' } : state;
    case 'RESULT':
      return state.phase === 'result' ? state : { phase: 'result', outcome: action.outcome };
    case 'RESET':
      return state.phase === 'submitting' ? state : INITIAL_SCAN_STATE;
  }
}

/** Show the instructor's +points only to the workshop owner (volunteer scans credit the instructor). */
export const shouldShowPoints = (source: 'OWNED' | 'ASSIGNED', points: number): boolean =>
  source === 'OWNED' && points > 0;
