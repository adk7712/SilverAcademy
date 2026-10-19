import { HttpsError } from 'firebase-functions/v2/https';
import { APP_ERROR_CODES, AppError, httpsCodeFor } from '@silveracademy/shared';
import { isAbortedError, toAppError, toHttpsError } from './errors';

describe('toHttpsError', () => {
  it('maps every AppErrorCode via httpsCodeFor and carries details.code', () => {
    for (const code of APP_ERROR_CODES) {
      if (code === 'INTERNAL') continue;
      const err = toHttpsError(new AppError(code, 'm', { extra: 1 }));
      expect(err.httpErrorCode.status).toBe(
        new HttpsError(httpsCodeFor(code), 'x').httpErrorCode.status,
      );
      expect(err.details).toEqual({ extra: 1, code });
    }
  });
  it('hides unknown errors behind INTERNAL', () => {
    const err = toHttpsError(new Error('db password is hunter2'));
    expect(err.code).toBe('internal');
    expect(err.message).not.toContain('hunter2');
    expect(err.details).toEqual({ code: 'INTERNAL' });
  });
  it('passes an existing HttpsError through', () => {
    const original = new HttpsError('not-found', 'x');
    expect(toHttpsError(original)).toBe(original);
  });
});

describe('Firestore ABORTED', () => {
  it('detects gRPC 10 and string codes', () => {
    expect(isAbortedError({ code: 10 })).toBe(true);
    expect(isAbortedError({ code: 'aborted' })).toBe(true);
    expect(isAbortedError({ code: 5 })).toBe(false);
    expect(isAbortedError(null)).toBe(false);
  });
  it('becomes BUSY_TRY_AGAIN (aborted)', () => {
    expect(toAppError({ code: 10 }).code).toBe('BUSY_TRY_AGAIN');
    expect(toHttpsError({ code: 10 }).code).toBe('aborted');
  });
});
