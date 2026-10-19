// Unit tests for the pure auth rules (UC #0-1, #0-2): no Firebase, no emulator.
import { MOCK_SINGPASS_PROFILES, type Role, type User } from '@silveracademy/shared';
import { decideSingpassLogin, singpassUid } from './controller/singpassLogin';
import { decideStaffLoginSuccess } from './controller/staffLogin';
import { MockSingpassVerifier, createSingpassVerifier } from './singpassVerifier';

const NOW = new Date('2026-10-19T04:00:00Z');
const identity = (dateOfBirth: string) => ({ sub: 'S1', name: 'N', dateOfBirth });
const codeOf = (fn: () => unknown) => {
  try {
    fn();
  } catch (e) {
    return (e as { code?: string }).code;
  }
};

describe('singpassUid', () => {
  it('is sp_ + 20 hex chars, stable per sub', () => {
    expect(singpassUid('S1')).toMatch(/^sp_[0-9a-f]{20}$/);
    expect(singpassUid('S1')).toBe(singpassUid('S1'));
    expect(singpassUid('S1')).not.toBe(singpassUid('S2'));
  });
});

describe('decideSingpassLogin: new users', () => {
  const newUser = (dob: string, registerAs?: 'LEARNER' | 'VOLUNTEER') =>
    decideSingpassLogin({ identity: identity(dob), existing: undefined, registerAs, now: NOW });

  it('requires registerAs', () => {
    expect(codeOf(() => newUser('1990-01-01'))).toBe('REGISTRATION_REQUIRED');
  });
  it('under 50 learner: LEARNER only', () => {
    expect(newUser('1991-03-14', 'LEARNER')).toEqual({
      isNewUser: true,
      roles: ['LEARNER'],
      seniorEligible: false,
    });
  });
  it('50th birthday today is eligible; the day before is not (SG calendar)', () => {
    expect(newUser('1976-10-19', 'LEARNER').roles).toEqual(['LEARNER', 'SENIOR_INSTRUCTOR']);
    expect(newUser('1976-10-20', 'LEARNER').roles).toEqual(['LEARNER']);
  });
  it('SG date is used: 23:00 UTC on the 18th is already the 19th in Singapore', () => {
    const late = decideSingpassLogin({
      identity: identity('1976-10-19'),
      existing: undefined,
      registerAs: 'LEARNER',
      now: new Date('2026-10-18T23:00:00Z'),
    });
    expect(late.seniorEligible).toBe(true);
  });
  it('volunteer never gets SENIOR_INSTRUCTOR but keeps seniorEligible', () => {
    expect(newUser('1950-01-01', 'VOLUNTEER')).toEqual({
      isNewUser: true,
      roles: ['VOLUNTEER'],
      seniorEligible: true,
    });
  });
  it('unreadable date of birth -> PROFILE_UNAVAILABLE (before registration check)', () => {
    expect(codeOf(() => newUser('not-a-date'))).toBe('PROFILE_UNAVAILABLE');
    expect(codeOf(() => newUser('2999-01-01', 'LEARNER'))).toBe('PROFILE_UNAVAILABLE');
  });
  it('mock profiles: 62 and 72 are eligible, 35 and 49 are not (fixed now)', () => {
    const eligible = Object.fromEntries(
      MOCK_SINGPASS_PROFILES.map((p) => [
        p.profileId,
        decideSingpassLogin({ identity: p, existing: undefined, registerAs: 'LEARNER', now: NOW })
          .seniorEligible,
      ]),
    );
    expect(eligible).toMatchObject({
      'learner-35': false,
      'senior-49-edge': false,
      'senior-50': true,
      'senior-62': true,
      'senior-72': true,
    });
  });
});

describe('decideSingpassLogin: existing users', () => {
  const existing = (roles: Role[], status: User['status'] = 'ACTIVE') => ({ roles, status });
  const login = (e: ReturnType<typeof existing>, dob: string, registerAs?: 'VOLUNTEER') =>
    decideSingpassLogin({ identity: identity(dob), existing: e, registerAs, now: NOW });

  it('suspended or inactive -> ACCOUNT_SUSPENDED', () => {
    expect(codeOf(() => login(existing(['LEARNER'], 'SUSPENDED'), '1960-01-01'))).toBe(
      'ACCOUNT_SUSPENDED',
    );
    expect(codeOf(() => login(existing(['LEARNER'], 'INACTIVE'), '1960-01-01'))).toBe(
      'ACCOUNT_SUSPENDED',
    );
  });
  it('is never REGISTRATION_REQUIRED and ignores registerAs', () => {
    expect(login(existing(['LEARNER']), '1991-01-01', 'VOLUNTEER')).toEqual({
      isNewUser: false,
      roles: ['LEARNER'],
      seniorEligible: false,
    });
  });
  it('a learner who has turned 50 gains SENIOR_INSTRUCTOR', () => {
    expect(login(existing(['LEARNER']), '1976-10-19').roles).toEqual([
      'LEARNER',
      'SENIOR_INSTRUCTOR',
    ]);
  });
  it('is idempotent and does not duplicate the role', () => {
    expect(login(existing(['LEARNER', 'SENIOR_INSTRUCTOR']), '1960-01-01').roles).toEqual([
      'LEARNER',
      'SENIOR_INSTRUCTOR',
    ]);
  });
  it('volunteers and other roles are left alone', () => {
    expect(login(existing(['VOLUNTEER']), '1950-01-01').roles).toEqual(['VOLUNTEER']);
  });
});

describe('decideStaffLoginSuccess', () => {
  const staff = (over: Partial<User> = {}) =>
    ({
      authType: 'STAFF',
      staffUserId: 'admin01',
      roles: ['ADMIN'],
      status: 'ACTIVE',
      ...over,
    }) as User;
  it('returns roles for an active matching staff account', () => {
    expect(decideStaffLoginSuccess(staff(), 'admin01')).toEqual(['ADMIN']);
    expect(decideStaffLoginSuccess(staff({ roles: ['COMMUNITY_PARTNER'] }), 'admin01')).toEqual([
      'COMMUNITY_PARTNER',
    ]);
  });
  it('NOT_STAFF_ACCOUNT for missing doc, mismatched id, Singpass account or non-staff roles', () => {
    expect(codeOf(() => decideStaffLoginSuccess(undefined, 'admin01'))).toBe('NOT_STAFF_ACCOUNT');
    expect(codeOf(() => decideStaffLoginSuccess(staff(), 'someone-else'))).toBe(
      'NOT_STAFF_ACCOUNT',
    );
    expect(codeOf(() => decideStaffLoginSuccess(staff({ authType: 'SINGPASS' }), 'admin01'))).toBe(
      'NOT_STAFF_ACCOUNT',
    );
    expect(codeOf(() => decideStaffLoginSuccess(staff({ roles: ['LEARNER'] }), 'admin01'))).toBe(
      'NOT_STAFF_ACCOUNT',
    );
  });
  it('suspended staff -> ACCOUNT_SUSPENDED', () => {
    expect(codeOf(() => decideStaffLoginSuccess(staff({ status: 'SUSPENDED' }), 'admin01'))).toBe(
      'ACCOUNT_SUSPENDED',
    );
  });
});

describe('MockSingpassVerifier', () => {
  const v = new MockSingpassVerifier();
  it('resolves a known profile', async () => {
    await expect(v.verify({ assertion: 'mock:senior-62' })).resolves.toMatchObject({
      sub: 'S-MOCK-SENIOR-62',
    });
  });
  it('FAIL, unknown profile and non-mock assertions -> SINGPASS_AUTH_FAILED; DOWN -> SINGPASS_UNAVAILABLE', async () => {
    for (const assertion of ['mock:FAIL', 'mock:nobody', 'eyJhbGciOi', '']) {
      await expect(v.verify({ assertion })).rejects.toMatchObject({ code: 'SINGPASS_AUTH_FAILED' });
    }
    await expect(v.verify({ assertion: 'mock:DOWN' })).rejects.toMatchObject({
      code: 'SINGPASS_UNAVAILABLE',
    });
  });
});

describe('createSingpassVerifier', () => {
  it('mock mode needs an emulator', () => {
    expect(
      createSingpassVerifier({ AUTH_MODE: 'mock', FUNCTIONS_EMULATOR: 'true' }),
    ).toBeInstanceOf(MockSingpassVerifier);
    expect(() => createSingpassVerifier({ AUTH_MODE: 'mock' })).toThrow(/emulators/);
  });
  it('production mode without a real verifier reports SINGPASS_UNAVAILABLE', async () => {
    await expect(
      createSingpassVerifier({ AUTH_MODE: 'singpass' }).verify({ assertion: 'x' }),
    ).rejects.toMatchObject({
      code: 'SINGPASS_UNAVAILABLE',
    });
  });
});
