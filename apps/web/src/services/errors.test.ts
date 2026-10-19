import { describe, expect, it } from 'vitest';
import { AppError, APP_ERROR_CODES } from '@silveracademy/shared';
import { errorMessage, fieldErrorsOf, isNetworkError, isSessionError, toAppError } from './errors';
import { strings } from '../strings';

describe('toAppError', () => {
  it('uses details.code from an HttpsError-like object', () => {
    const e = toAppError({
      code: 'functions/failed-precondition',
      details: { code: 'WORKSHOP_FULL', x: 1 },
    });
    expect(e).toBeInstanceOf(AppError);
    expect(e.code).toBe('WORKSHOP_FULL');
    expect(e.details).toEqual({ x: 1 });
  });

  it('ignores unknown details.code and falls back on the SDK code', () => {
    expect(toAppError({ code: 'functions/unauthenticated', details: { code: 'NOPE' } }).code).toBe(
      'UNAUTHENTICATED',
    );
    expect(toAppError({ code: 'functions/not-found' }).code).toBe('NOT_FOUND');
  });

  it('flags network-level failures', () => {
    const e = toAppError({ code: 'functions/unavailable', message: 'raw' });
    expect(e.code).toBe('INTERNAL');
    expect(isNetworkError(e)).toBe(true);
  });

  it('passes AppError through and maps unknown values to INTERNAL', () => {
    const own = new AppError('NOT_FOUND');
    expect(toAppError(own)).toBe(own);
    expect(toAppError('boom').code).toBe('INTERNAL');
    expect(toAppError(null).code).toBe('INTERNAL');
  });
});

describe('errorMessage', () => {
  it('has a message for every AppErrorCode', () => {
    for (const code of APP_ERROR_CODES) expect(strings.errors[code]).toBeTruthy();
  });

  it('never leaks raw messages', () => {
    const text = errorMessage({ code: 'functions/internal', message: 'stack trace here' });
    expect(text).toBe(strings.errors.INTERNAL);
  });

  it('uses network text for network errors', () => {
    expect(errorMessage({ code: 'functions/unavailable' })).toBe(strings.errors.NETWORK);
  });
});

describe('fieldErrorsOf', () => {
  it('returns the first message per field', () => {
    const err = {
      details: {
        code: 'INVALID_INPUT',
        fieldErrors: { email: ['Bad', 'Worse'], name: 'Req', n: 3 },
      },
    };
    expect(fieldErrorsOf(err)).toEqual({ email: 'Bad', name: 'Req' });
  });
  it('is empty when absent', () => expect(fieldErrorsOf(new Error('x'))).toEqual({}));
});

describe('isSessionError', () => {
  it('is true only for session-ending codes', () => {
    expect(isSessionError(new AppError('UNAUTHENTICATED'))).toBe(true);
    expect(isSessionError(new AppError('ACCOUNT_SUSPENDED'))).toBe(true);
    expect(isSessionError(new AppError('SLOT_OVERLAP'))).toBe(false);
    expect(isSessionError({ code: 'functions/unauthenticated' })).toBe(true);
    expect(isSessionError(null)).toBe(false);
  });
});
