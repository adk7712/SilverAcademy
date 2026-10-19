// UC #0-1 / FR 1.3 tests for claim parsing, mode eligibility (50+ toggle) and mode resolution.
import {
  availableModes,
  canToggleMode,
  claimsWithFallback,
  orFallback,
  parseClaims,
  resolveMode,
} from './sessionLogic';

describe('parseClaims', () => {
  it('keeps valid roles and status', () => {
    expect(parseClaims({ roles: ['LEARNER', 'SENIOR_INSTRUCTOR'], status: 'ACTIVE' })).toEqual({
      roles: ['LEARNER', 'SENIOR_INSTRUCTOR'],
      status: 'ACTIVE',
    });
  });
  it('drops unknown roles and defaults status to ACTIVE', () => {
    expect(parseClaims({ roles: ['LEARNER', 'HACKER'] })).toEqual({
      roles: ['LEARNER'],
      status: 'ACTIVE',
    });
  });
  it('tolerates missing claims', () => {
    expect(parseClaims(null)).toEqual({ roles: [], status: 'ACTIVE' });
    expect(parseClaims({ roles: 'LEARNER', status: 'WEIRD' })).toEqual({
      roles: [],
      status: 'ACTIVE',
    });
  });
  it('preserves a suspended status', () => {
    expect(parseClaims({ roles: ['LEARNER'], status: 'SUSPENDED' }).status).toBe('SUSPENDED');
  });
});

describe('canToggleMode', () => {
  it('is true only for Learner + Senior Instructor holders', () => {
    expect(canToggleMode(['LEARNER', 'SENIOR_INSTRUCTOR'])).toBe(true);
    expect(canToggleMode(['LEARNER'])).toBe(false);
    expect(canToggleMode(['VOLUNTEER'])).toBe(false);
    expect(canToggleMode(['SENIOR_INSTRUCTOR'])).toBe(false);
  });
});

describe('availableModes / resolveMode', () => {
  it('excludes staff roles from mobile modes', () => {
    expect(availableModes(['ADMIN', 'COMMUNITY_PARTNER'])).toEqual([]);
    expect(resolveMode(['ADMIN'], 'LEARNER')).toBeNull();
  });
  it('uses the stored mode when still valid', () => {
    expect(resolveMode(['LEARNER', 'SENIOR_INSTRUCTOR'], 'SENIOR_INSTRUCTOR')).toBe(
      'SENIOR_INSTRUCTOR',
    );
  });
  it('falls back to the first available mode for stale or missing preferences', () => {
    expect(resolveMode(['LEARNER'], 'SENIOR_INSTRUCTOR')).toBe('LEARNER');
    expect(resolveMode(['VOLUNTEER'], null)).toBe('VOLUNTEER');
    expect(resolveMode(['LEARNER', 'SENIOR_INSTRUCTOR'], undefined)).toBe('LEARNER');
  });
});

describe('claimsWithFallback (offline cold start, H2)', () => {
  const cached = { roles: ['LEARNER'], status: 'ACTIVE' };
  it('returns live claims and remembers them', async () => {
    const live = { roles: ['LEARNER', 'VOLUNTEER'], status: 'ACTIVE' };
    const remember = jest.fn();
    await expect(claimsWithFallback(async () => live, cached, remember)).resolves.toBe(live);
    expect(remember).toHaveBeenCalledWith(live);
  });
  it('falls back to cached claims when the token refresh throws', async () => {
    const remember = jest.fn();
    const failing = () => Promise.reject(new Error('auth/network-request-failed'));
    await expect(claimsWithFallback(failing, cached, remember)).resolves.toBe(cached);
    expect(remember).not.toHaveBeenCalled();
  });
  it('returns null when offline with nothing cached', async () => {
    await expect(
      claimsWithFallback(() => Promise.reject(new Error('x')), null, jest.fn()),
    ).resolves.toBeNull();
  });
});

describe('orFallback', () => {
  it('passes through, falls back on rejection and on timeout', async () => {
    await expect(orFallback(Promise.resolve(1), 50, 0)).resolves.toBe(1);
    await expect(orFallback(Promise.reject(new Error('x')), 50, 0)).resolves.toBe(0);
    await expect(orFallback(new Promise<number>(() => undefined), 10, 7)).resolves.toBe(7);
  });
});
