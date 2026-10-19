// UC #0-1 AuthProvider / SingpassVerifier interfaces (architecture.md 5.1). Types only.
import type { RegisterAs } from '../enums';

export interface SingpassAssertion {
  assertion: string;
  nonce?: string;
}

export interface AuthProvider {
  readonly kind: 'mock-singpass' | 'singpass';
  /** False if the IdP is unreachable; UI shows SINGPASS_UNAVAILABLE (#0-1 Ex2). */
  isAvailable(): Promise<boolean>;
  /** Rejects with AppError SINGPASS_AUTH_FAILED | SINGPASS_UNAVAILABLE. */
  authenticate(): Promise<SingpassAssertion>;
}

export interface SingpassIdentity {
  sub: string;
  name: string;
  dateOfBirth: string; // YYYY-MM-DD
}

/** Implemented in functions/src/auth/SingpassVerifier.ts. */
export interface SingpassVerifier {
  verify(assertion: SingpassAssertion): Promise<SingpassIdentity>;
}

export interface MockSingpassProfile extends SingpassIdentity {
  profileId: string;
  label: string;
  suggestedRegisterAs: RegisterAs;
}
