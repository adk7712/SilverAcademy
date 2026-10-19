// UC #1-4 #3-4 tests for scan state machine, debounce gate and error classification.
import { AppError, buildQrPayload } from '@silveracademy/shared';
import {
  INITIAL_GATE,
  INITIAL_SCAN_STATE,
  SAME_CODE_COOLDOWN_MS,
  acceptScan,
  invalidQrOutcome,
  isScannableQr,
  outcomeFromError,
  scanReducer,
  shouldShowPoints,
  successOutcome,
} from './scanLogic';

const sig = 'A'.repeat(22);

describe('isScannableQr', () => {
  it('accepts the SA1 shape and rejects everything else', () => {
    expect(isScannableQr(buildQrPayload('ws-01_u1', sig))).toBe(true);
    expect(isScannableQr('https://example.com')).toBe(false);
    expect(isScannableQr('SA1.abc.short')).toBe(false);
    expect(isScannableQr('')).toBe(false);
  });
});

describe('acceptScan debounce', () => {
  it('accepts the first read, ignores the same value in the cooldown, accepts after it', () => {
    const g1 = acceptScan(INITIAL_GATE, 'x', 1000);
    expect(g1).toEqual({ lastValue: 'x', lastAt: 1000 });
    expect(acceptScan(g1!, 'x', 1000 + SAME_CODE_COOLDOWN_MS - 1)).toBeNull();
    expect(acceptScan(g1!, 'x', 1000 + SAME_CODE_COOLDOWN_MS)).not.toBeNull();
  });
  it('accepts a different value immediately', () => {
    const g1 = acceptScan(INITIAL_GATE, 'x', 1000)!;
    expect(acceptScan(g1, 'y', 1001)).toEqual({ lastValue: 'y', lastAt: 1001 });
  });
});

describe('scanReducer', () => {
  const ok = successOutcome({
    bookingId: 'b',
    learnerName: 'Amy',
    workshopTitle: 'W',
    attendedAt: '2026-01-01T00:00:00Z',
    method: 'QR',
    pointsAwarded: 1,
  });
  it('moves scanning -> submitting -> result -> scanning', () => {
    const s1 = scanReducer(INITIAL_SCAN_STATE, { type: 'SUBMIT' });
    expect(s1).toEqual({ phase: 'submitting' });
    const s2 = scanReducer(s1, { type: 'RESULT', outcome: ok });
    expect(s2).toEqual({ phase: 'result', outcome: ok });
    expect(scanReducer(s2, { type: 'RESET' })).toEqual(INITIAL_SCAN_STATE);
  });
  it('ignores a second SUBMIT while submitting or showing a result', () => {
    const sub = scanReducer(INITIAL_SCAN_STATE, { type: 'SUBMIT' });
    expect(scanReducer(sub, { type: 'SUBMIT' })).toBe(sub);
    const res = scanReducer(sub, { type: 'RESULT', outcome: ok });
    expect(scanReducer(res, { type: 'SUBMIT' })).toBe(res);
  });
  it('keeps the first result and does not reset mid-request', () => {
    const res = scanReducer(INITIAL_SCAN_STATE, { type: 'RESULT', outcome: invalidQrOutcome() });
    expect(scanReducer(res, { type: 'RESULT', outcome: ok })).toBe(res);
    const sub = scanReducer(INITIAL_SCAN_STATE, { type: 'SUBMIT' });
    expect(scanReducer(sub, { type: 'RESET' })).toBe(sub);
  });
});

describe('outcomeFromError', () => {
  const kindOf = (code: ConstructorParameters<typeof AppError>[0]) => {
    const o = outcomeFromError(new AppError(code));
    return o.status === 'error' ? o.kind : 'success';
  };
  it('maps scan error codes to distinct kinds', () => {
    expect(kindOf('INVALID_QR')).toBe('INVALID_QR');
    expect(kindOf('WRONG_WORKSHOP')).toBe('WRONG_WORKSHOP');
    expect(kindOf('NO_BOOKING')).toBe('NO_BOOKING');
    expect(kindOf('TICKET_NOT_FOUND')).toBe('TICKET_NOT_FOUND');
    expect(kindOf('SESSION_NOT_ACTIVE')).toBe('WINDOW_CLOSED');
    expect(kindOf('NOT_AUTHORISED_FOR_WORKSHOP')).toBe('NOT_AUTHORISED');
    expect(kindOf('WORKSHOP_FULL')).toBe('OTHER');
  });
  it('carries who/when for ALREADY_ATTENDED', () => {
    const o = outcomeFromError(
      new AppError('ALREADY_ATTENDED', undefined, { learnerName: 'Amy', attendedAt: 'T' }),
    );
    expect(o).toMatchObject({ kind: 'ALREADY_ATTENDED', learnerName: 'Amy', attendedAt: 'T' });
  });
  it('classifies connectivity failures', () => {
    const o = outcomeFromError({ code: 'functions/unavailable' });
    expect(o).toMatchObject({ status: 'error', kind: 'NETWORK' });
  });
});

describe('shouldShowPoints', () => {
  it('only for the owner with points', () => {
    expect(shouldShowPoints('OWNED', 1)).toBe(true);
    expect(shouldShowPoints('ASSIGNED', 1)).toBe(false);
    expect(shouldShowPoints('OWNED', 0)).toBe(false);
  });
});
