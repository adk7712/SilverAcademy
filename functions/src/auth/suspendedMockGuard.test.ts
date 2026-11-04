// Unit tests for the mock-mode-only suspended-demo guard in decideSingpassLogin (UC #0-1): no Firebase, no emulator.
import { MOCK_SINGPASS_PROFILES, type Role, type User } from '@silveracademy/shared';
import { decideSingpassLogin } from './controller/singpassLogin';

const NOW = new Date('2026-10-19T04:00:00Z');
const codeOf = (fn: () => unknown) => {
  try {
    fn();
  } catch (e) {
    return (e as { code?: string }).code;
  }
};

describe('decideSingpassLogin: suspended-demo guard (mock mode only)', () => {
  const suspendedDemo = MOCK_SINGPASS_PROFILES.find((p) => p.profileId === 'suspended-demo')!;
  const run = (over: Partial<Parameters<typeof decideSingpassLogin>[0]>) =>
    decideSingpassLogin({
      identity: suspendedDemo,
      existing: undefined,
      registerAs: 'LEARNER',
      now: NOW,
      ...over,
    });

  it('mock mode, no user doc: ACCOUNT_SUSPENDED even with registerAs', () => {
    expect(codeOf(() => run({ mockMode: true }))).toBe('ACCOUNT_SUSPENDED');
    expect(codeOf(() => run({ mockMode: true, registerAs: undefined }))).toBe('ACCOUNT_SUSPENDED');
  });
  it('mock mode, doc exists: normal logic (suspended refused, reactivated logs in)', () => {
    const existing = (status: User['status']) => ({ roles: ['LEARNER'] as Role[], status });
    expect(codeOf(() => run({ mockMode: true, existing: existing('SUSPENDED') }))).toBe(
      'ACCOUNT_SUSPENDED',
    );
    expect(run({ mockMode: true, existing: existing('ACTIVE') }).isNewUser).toBe(false);
  });
  it('outside mock mode the guard does not apply', () => {
    expect(run({}).isNewUser).toBe(true);
    expect(run({ mockMode: false }).isNewUser).toBe(true);
  });
  it('does not affect any other identity', () => {
    for (const p of MOCK_SINGPASS_PROFILES.filter((x) => x.profileId !== 'suspended-demo')) {
      expect(
        decideSingpassLogin({
          identity: p,
          existing: undefined,
          registerAs: 'LEARNER',
          now: NOW,
          mockMode: true,
        }).isNewUser,
      ).toBe(true);
    }
  });
});
