// Maps any thrown value (FirebaseError from callables/auth, AppError, unknown) to AppError (architecture.md 6).
// Pure and duck-typed so it is unit-testable without Firebase. Raw Firebase messages are never kept.
import { AppError, isAppError, isAppErrorCode } from '@silveracademy/shared';

/** Marker placed in AppError.details.reason for client-side failures that have no server AppErrorCode. */
export const ERROR_REASON = { network: 'NETWORK', unknown: 'UNKNOWN' } as const;

const NETWORK_CODES = new Set([
  'functions/unavailable',
  'functions/deadline-exceeded',
  'auth/network-request-failed',
  'unavailable',
]);

const FIREBASE_CODE_MAP: Readonly<
  Record<string, 'UNAUTHENTICATED' | 'PERMISSION_DENIED' | 'ACCOUNT_SUSPENDED'>
> = {
  'functions/unauthenticated': 'UNAUTHENTICATED',
  'functions/permission-denied': 'PERMISSION_DENIED',
  'permission-denied': 'PERMISSION_DENIED',
  'auth/user-disabled': 'ACCOUNT_SUSPENDED',
};

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;

export function toAppError(e: unknown): AppError {
  if (isAppError(e)) return e;
  if (isRecord(e)) {
    const details = isRecord(e.details) ? e.details : undefined;
    if (details && isAppErrorCode(details.code)) {
      const { code, ...rest } = details;
      return new AppError(code as AppError['code'], undefined, rest);
    }
    const firebaseCode = typeof e.code === 'string' ? e.code : '';
    if (NETWORK_CODES.has(firebaseCode)) {
      return new AppError('INTERNAL', undefined, { reason: ERROR_REASON.network });
    }
    const mapped = FIREBASE_CODE_MAP[firebaseCode];
    if (mapped) return new AppError(mapped);
  }
  return new AppError('INTERNAL', undefined, { reason: ERROR_REASON.unknown });
}

export const isNetworkError = (e: AppError): boolean => e.details?.reason === ERROR_REASON.network;
