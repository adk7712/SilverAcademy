// Tests for AppError, AppErrorCode and HttpsError mapping.
import { AppError, AppErrorCode, APP_ERROR_CODES, httpsCodeFor, isAppErrorCode } from './errors';

describe('errors', () => {
  it('has the documented codes with enum-style access', () => {
    expect(APP_ERROR_CODES).toHaveLength(new Set(APP_ERROR_CODES).size);
    expect(APP_ERROR_CODES).toHaveLength(63);
    expect(AppErrorCode.WORKSHOP_FULL).toBe('WORKSHOP_FULL');
    expect(isAppErrorCode('NOPE')).toBe(false);
  });
  it('AppError carries code and details', () => {
    const e = new AppError(AppErrorCode.ALREADY_BOOKED, undefined, { bookingId: 'b' });
    expect(e.code).toBe('ALREADY_BOOKED');
    expect(e.details).toEqual({ bookingId: 'b' });
    expect(e.message).toBe('ALREADY_BOOKED');
    expect(e instanceof Error).toBe(true);
  });
  it('maps to HttpsError codes per architecture 6, every code resolves', () => {
    expect(httpsCodeFor('UNAUTHENTICATED')).toBe('unauthenticated');
    expect(httpsCodeFor('ACCOUNT_SUSPENDED')).toBe('permission-denied');
    expect(httpsCodeFor('REASON_REQUIRED')).toBe('invalid-argument');
    expect(httpsCodeFor('TICKET_NOT_FOUND')).toBe('not-found');
    expect(httpsCodeFor('ALREADY_ATTENDED')).toBe('already-exists');
    expect(httpsCodeFor('OUT_OF_STOCK')).toBe('resource-exhausted');
    expect(httpsCodeFor('MAP_UNAVAILABLE')).toBe('unavailable');
    expect(httpsCodeFor('STALE_VERSION')).toBe('aborted');
    expect(httpsCodeFor('SLOT_CONFLICT')).toBe('failed-precondition');
    for (const c of APP_ERROR_CODES) expect(httpsCodeFor(c)).toBeTruthy();
  });
});
