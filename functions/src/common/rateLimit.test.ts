// Review M3: pure fixed-window logic.
import { nextBucket, rateKeyPart } from './rateLimit';

describe('nextBucket', () => {
  it('starts a window and counts up to the limit', () => {
    let b = nextBucket(undefined, 2, 1000, 0);
    expect(b).toEqual({ windowStart: 0, count: 1 });
    b = nextBucket(b!, 2, 1000, 500);
    expect(b).toEqual({ windowStart: 0, count: 2 });
    expect(nextBucket(b!, 2, 1000, 900)).toBeNull();
  });
  it('resets after the window', () => {
    expect(nextBucket({ windowStart: 0, count: 2 }, 2, 1000, 1000)).toEqual({
      windowStart: 1000,
      count: 1,
    });
  });
  it('key parts are stable and id-safe', () => {
    expect(rateKeyPart('Admin/01')).toBe(rateKeyPart('Admin/01'));
    expect(rateKeyPart('a/b')).toMatch(/^[0-9a-f]{16}$/);
  });
});
