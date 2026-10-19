// Maps FirebaseError / HttpsError to AppError via details.code (architecture 6). Pure, no firebase import.
import { AppError, isAppError, isAppErrorCode, type AppErrorCode } from '@silveracademy/shared';
import { strings } from '../strings';

/** Fallback when the server sent no `details.code` (SDK/network level failures). */
const FUNCTIONS_CODE_FALLBACK: Readonly<Record<string, AppErrorCode>> = {
  'functions/unauthenticated': 'UNAUTHENTICATED',
  'functions/permission-denied': 'PERMISSION_DENIED',
  'functions/invalid-argument': 'INVALID_INPUT',
  'functions/not-found': 'NOT_FOUND',
  'functions/aborted': 'BUSY_TRY_AGAIN',
};
const NETWORK_CODES: readonly string[] = ['functions/unavailable', 'functions/deadline-exceeded'];

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;

/** Converts anything thrown by a callable into an AppError. Raw Firebase messages are never kept. */
export function toAppError(e: unknown): AppError {
  if (isAppError(e)) return e;
  if (!isRecord(e)) return new AppError('INTERNAL');
  const details = isRecord(e.details) ? e.details : undefined;
  if (details && isAppErrorCode(details.code)) {
    const { code, ...rest } = details;
    return new AppError(code as AppErrorCode, undefined, rest);
  }
  const sdkCode = typeof e.code === 'string' ? e.code : '';
  if (NETWORK_CODES.includes(sdkCode))
    return new AppError('INTERNAL', undefined, { network: true });
  return new AppError(FUNCTIONS_CODE_FALLBACK[sdkCode] ?? 'INTERNAL');
}

export const isNetworkError = (e: AppError): boolean => e.details?.network === true;

/** User-readable text for an error (any thrown value). */
export function errorMessage(e: unknown): string {
  const err = toAppError(e);
  return isNetworkError(err) ? strings.errors.NETWORK : strings.errors[err.code];
}

/** Per-field messages from `details.fieldErrors` (INVALID_INPUT), first message per field. */
export function fieldErrorsOf(e: unknown): Record<string, string> {
  const raw = toAppError(e).details?.fieldErrors;
  if (!isRecord(raw)) return {};
  const out: Record<string, string> = {};
  for (const [field, v] of Object.entries(raw)) {
    const first = Array.isArray(v) ? v[0] : v;
    if (typeof first === 'string') out[field] = first;
  }
  return out;
}

const SESSION_CODES: readonly AppErrorCode[] = ['UNAUTHENTICATED', 'ACCOUNT_SUSPENDED'];

/** True when the session is gone (caller must log out; handoff 2.2 rule). */
export const isSessionError = (e: unknown): boolean => SESSION_CODES.includes(toAppError(e).code);
