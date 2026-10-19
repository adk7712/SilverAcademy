// Unit tests for the Firebase-error to AppError mapper and user message lookup (architecture.md 6).
import { APP_ERROR_CODES, AppError } from '@silveracademy/shared';
import { strings } from '../../i18n';
import { errorMessage } from './errorMessage';
import { isNetworkError, toAppError } from './toAppError';

const firebaseError = (code: string, details?: unknown) => ({
  code,
  message: 'raw secret text',
  details,
});

describe('toAppError', () => {
  it('reads details.code from a functions error and keeps remaining details', () => {
    const e = toAppError(
      firebaseError('functions/resource-exhausted', { code: 'WORKSHOP_FULL', seatsRemaining: 0 }),
    );
    expect(e).toBeInstanceOf(AppError);
    expect(e.code).toBe('WORKSHOP_FULL');
    expect(e.details).toEqual({ seatsRemaining: 0 });
  });

  it('passes AppError through unchanged', () => {
    const original = new AppError('ALREADY_BOOKED', undefined, { bookingId: 'b1' });
    expect(toAppError(original)).toBe(original);
  });

  it('ignores unknown details.code values', () => {
    expect(toAppError(firebaseError('functions/internal', { code: 'NOPE' })).code).toBe('INTERNAL');
  });

  it('maps connectivity failures to a network-flagged INTERNAL', () => {
    const e = toAppError(firebaseError('functions/unavailable'));
    expect(e.code).toBe('INTERNAL');
    expect(isNetworkError(e)).toBe(true);
  });

  it('maps plain firebase codes and disabled auth users', () => {
    expect(toAppError(firebaseError('functions/unauthenticated')).code).toBe('UNAUTHENTICATED');
    expect(toAppError(firebaseError('functions/permission-denied')).code).toBe('PERMISSION_DENIED');
    expect(toAppError(firebaseError('auth/user-disabled')).code).toBe('ACCOUNT_SUSPENDED');
  });

  it('turns non-objects into INTERNAL', () => {
    expect(toAppError('boom').code).toBe('INTERNAL');
    expect(toAppError(undefined).code).toBe('INTERNAL');
  });
});

describe('errorMessage', () => {
  it('has a non-empty message for every AppErrorCode', () => {
    for (const code of APP_ERROR_CODES) {
      expect(strings.errors[code].length).toBeGreaterThan(0);
    }
  });

  it('never leaks the raw Firebase message', () => {
    expect(errorMessage(firebaseError('functions/internal'))).not.toContain('raw secret');
  });

  it('uses the offline text for network errors', () => {
    expect(errorMessage(firebaseError('functions/unavailable'))).toBe(strings.clientErrors.network);
  });

  it('uses the per-code text otherwise', () => {
    expect(errorMessage(new AppError('WORKSHOP_FULL'))).toBe(strings.errors.WORKSHOP_FULL);
  });
});
