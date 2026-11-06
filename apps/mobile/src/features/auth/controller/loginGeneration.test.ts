// UC #0-1 tests for the login generation token: stale attempts are never current.
import { createLoginGeneration } from './loginGeneration';

describe('createLoginGeneration', () => {
  it('the latest attempt is current', () => {
    const gen = createLoginGeneration();
    const t = gen.begin();
    expect(gen.isCurrent(t)).toBe(true);
  });
  it('invalidate (reset/leave) makes an in-flight attempt stale', () => {
    const gen = createLoginGeneration();
    const t = gen.begin();
    gen.invalidate();
    expect(gen.isCurrent(t)).toBe(false);
  });
  it('a newer attempt makes the older one stale', () => {
    const gen = createLoginGeneration();
    const old = gen.begin();
    const next = gen.begin();
    expect(gen.isCurrent(old)).toBe(false);
    expect(gen.isCurrent(next)).toBe(true);
  });
  it('a ticket stays stale after later attempts and invalidations', () => {
    const gen = createLoginGeneration();
    const old = gen.begin();
    gen.invalidate();
    gen.begin();
    expect(gen.isCurrent(old)).toBe(false);
  });
});
