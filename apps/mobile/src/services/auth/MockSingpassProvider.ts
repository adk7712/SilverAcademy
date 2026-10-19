// UC #0-1 mock Singpass AuthProvider (ADR-001/006): the assertion is `mock:<profileId>`, verified by the mock verifier.
import {
  MOCK_ASSERTION_PREFIX,
  type AuthProvider,
  type SingpassAssertion,
} from '@silveracademy/shared';

export class MockSingpassProvider implements AuthProvider {
  readonly kind = 'mock-singpass' as const;

  constructor(private readonly profileId: string) {}

  /** The mock IdP is always reachable; the DOWN profile makes the server answer SINGPASS_UNAVAILABLE. */
  async isAvailable(): Promise<boolean> {
    return true;
  }

  async authenticate(): Promise<SingpassAssertion> {
    return { assertion: `${MOCK_ASSERTION_PREFIX}${this.profileId}` };
  }
}
