// Turns any thrown value into user-facing text via the central strings (architecture.md 6). Pure.
import { strings } from '../../i18n';
import { isNetworkError, toAppError } from './toAppError';

export function errorMessage(error: unknown): string {
  const appError = toAppError(error);
  if (isNetworkError(appError)) return strings.clientErrors.network;
  return strings.errors[appError.code];
}
