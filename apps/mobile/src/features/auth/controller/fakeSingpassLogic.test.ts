// UC #0-1 tests for the fake Singpass ID check, screen states and simulations.
import { AppError } from '@silveracademy/shared';
import {
  checkIdLogin,
  deriveScreenState,
  resolveTypedProfileId,
  SIMULATIONS,
} from './fakeSingpassLogic';

describe('resolveTypedProfileId', () => {
  it('accepts seed ids, trimmed and case-insensitive, returning the canonical id', () => {
    expect(resolveTypedProfileId('learner-35')).toBe('learner-35');
    expect(resolveTypedProfileId('  Senior-62 \n')).toBe('senior-62');
  });
  it('accepts hidden seed ids by typing', () => {
    expect(resolveTypedProfileId('senior-49-edge')).toBe('senior-49-edge');
    expect(resolveTypedProfileId('suspended-demo')).toBe('suspended-demo');
  });
  it('rejects unknown text, NRIC-shaped text, empty text and the FAIL/DOWN simulation ids', () => {
    for (const bad of [
      '',
      '   ',
      'learner-36',
      'S1234567D',
      'fail',
      'DOWN',
      'mock:senior-62',
      '__proto__',
      'constructor',
    ]) {
      expect(resolveTypedProfileId(bad)).toBeNull();
    }
  });
});

describe('checkIdLogin', () => {
  it('passes with a known id and any non-empty password', () => {
    expect(checkIdLogin('senior-62', 'x')).toEqual({ ok: true, profileId: 'senior-62' });
    expect(checkIdLogin('senior-62', ' ')).toEqual({ ok: true, profileId: 'senior-62' });
  });
  it('never echoes the password in its result', () => {
    expect(JSON.stringify(checkIdLogin('senior-62', 'hunter2-secret'))).not.toContain('hunter2');
    expect(JSON.stringify(checkIdLogin('nope', 'hunter2-secret'))).not.toContain('hunter2');
  });
  it('requires a password', () => {
    expect(checkIdLogin('senior-62', '')).toEqual({
      ok: false,
      idError: undefined,
      passwordError: 'passwordRequired',
    });
  });
  it('flags empty and unknown ids and does not return a profile id for them', () => {
    expect(checkIdLogin('', 'pw')).toMatchObject({ ok: false, idError: 'idRequired' });
    expect(checkIdLogin('S1234567D', 'pw')).toMatchObject({ ok: false, idError: 'idUnknown' });
    expect(checkIdLogin('S1234567D', 'pw')).not.toHaveProperty('profileId');
  });
  it('reports both field errors together', () => {
    expect(checkIdLogin('', '')).toEqual({
      ok: false,
      idError: 'idRequired',
      passwordError: 'passwordRequired',
    });
  });
});

describe('deriveScreenState', () => {
  const error = new AppError('SINGPASS_AUTH_FAILED');
  it('maps the login phase to idle, signing in, register and error', () => {
    expect(deriveScreenState({ kind: 'idle' }, null)).toEqual({ kind: 'idle' });
    expect(deriveScreenState({ kind: 'loading', stage: 'exchange' }, null)).toEqual({
      kind: 'signingIn',
      stage: 'exchange',
    });
    expect(deriveScreenState({ kind: 'loading', stage: 'session' }, null)).toEqual({
      kind: 'signingIn',
      stage: 'session',
    });
    expect(deriveScreenState({ kind: 'register', profileId: 'p' }, null)).toEqual({
      kind: 'register',
      profileId: 'p',
    });
    expect(deriveScreenState({ kind: 'error', error }, null)).toEqual({ kind: 'error', error });
  });
  it('shows approving while an approval is pending', () => {
    expect(deriveScreenState({ kind: 'idle' }, 'senior-62')).toEqual({
      kind: 'approving',
      profileId: 'senior-62',
    });
  });
});

describe('SIMULATIONS', () => {
  it('lists edge, suspended, down and fail', () => {
    expect(SIMULATIONS.map((s) => s.profileId)).toEqual([
      'senior-49-edge',
      'suspended-demo',
      'DOWN',
      'FAIL',
    ]);
  });
});
