// AppError -> HttpsError mapping and Firestore error classification (architecture.md section 6). Cross-cutting.
import { HttpsError } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions/v2';
import { AppError, httpsCodeFor, isAppError, type ErrorDetails } from '@silveracademy/shared';

const GRPC_ABORTED = 10;

/** True for Firestore transaction contention that survived all retries (gRPC ABORTED). */
export function isAbortedError(e: unknown): boolean {
  if (typeof e !== 'object' || e === null || !('code' in e)) return false;
  const code = (e as { code: unknown }).code;
  return code === GRPC_ABORTED || code === 'aborted' || code === 'ABORTED';
}

/**
 * Normalises anything thrown in a handler to an AppError.
 * AppError passes through; Firestore ABORTED -> BUSY_TRY_AGAIN; anything else (including HttpsError) -> INTERNAL.
 * (toHttpsError returns an HttpsError unchanged before calling this.)
 */
export function toAppError(e: unknown): AppError {
  if (isAppError(e)) return e;
  if (isAbortedError(e)) return new AppError('BUSY_TRY_AGAIN', 'Please try again.');
  return new AppError('INTERNAL', 'Something went wrong.');
}

/** Converts to the HttpsError clients see: `details.code` carries the AppErrorCode (apps/services/callables.ts reads it). */
export function toHttpsError(e: unknown): HttpsError {
  if (e instanceof HttpsError) return e;
  const appError = toAppError(e);
  if (appError.code === 'INTERNAL') logger.error('Unhandled error in callable', e);
  const details: ErrorDetails = { ...(appError.details ?? {}), code: appError.code };
  // INTERNAL is not a failed precondition: use the dedicated code so clients/monitoring treat it as a server fault.
  const code = appError.code === 'INTERNAL' ? 'internal' : httpsCodeFor(appError.code);
  return new HttpsError(code, appError.message, details);
}
