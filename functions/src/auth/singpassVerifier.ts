// UC #0-1 SingpassVerifier implementations (ADR-001, ADR-006). Real Singpass replaces only this file.
import {
  AppError,
  MOCK_ASSERTION_PREFIX,
  MOCK_DOWN_PROFILE_ID,
  MOCK_FAIL_PROFILE_ID,
  findMockProfile,
  type SingpassAssertion,
  type SingpassIdentity,
  type SingpassVerifier,
} from '@silveracademy/shared';
import { authMode, isEmulator } from '../common';

/** Accepts `mock:<profileId>`; `FAIL` and `DOWN` simulate #0-1 Ex1 / Ex2. Never use outside emulators. */
export class MockSingpassVerifier implements SingpassVerifier {
  verify(input: SingpassAssertion): Promise<SingpassIdentity> {
    const { assertion } = input;
    if (!assertion.startsWith(MOCK_ASSERTION_PREFIX)) {
      return Promise.reject(new AppError('SINGPASS_AUTH_FAILED'));
    }
    const profileId = assertion.slice(MOCK_ASSERTION_PREFIX.length);
    if (profileId === MOCK_DOWN_PROFILE_ID) {
      return Promise.reject(new AppError('SINGPASS_UNAVAILABLE'));
    }
    const profile = profileId === MOCK_FAIL_PROFILE_ID ? undefined : findMockProfile(profileId);
    if (!profile) return Promise.reject(new AppError('SINGPASS_AUTH_FAILED'));
    return Promise.resolve({
      sub: profile.sub,
      name: profile.name,
      dateOfBirth: profile.dateOfBirth,
    });
  }
}

/** Placeholder until real Singpass onboarding exists: every exchange reports the IdP as unavailable. */
class UnconfiguredSingpassVerifier implements SingpassVerifier {
  verify(): Promise<SingpassIdentity> {
    return Promise.reject(new AppError('SINGPASS_UNAVAILABLE', 'Singpass is not configured.'));
  }
}

/** Chooses by env AUTH_MODE. The mock refuses to run outside the emulators. */
export function createSingpassVerifier(env: NodeJS.ProcessEnv = process.env): SingpassVerifier {
  if (authMode(env) === 'mock') {
    if (!isEmulator(env)) throw new Error('AUTH_MODE=mock is only allowed in the emulators');
    return new MockSingpassVerifier();
  }
  return new UnconfiguredSingpassVerifier();
}
