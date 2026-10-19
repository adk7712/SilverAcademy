// Local view models for auth; entity types come from @silveracademy/shared. UC #0-2 AuthenticateWithAdminCredentials.
import type { AccountStatus, Role, StaffRole } from '@silveracademy/shared';

/** Custom claims on every ID token (architecture 3.2). */
export interface SessionClaims {
  roles: Role[];
  status: AccountStatus | undefined;
}

export interface SessionUser {
  uid: string;
  /** Staff login id, derived from the account email. */
  userId: string;
  /** Staff roles held (ADMIN and/or COMMUNITY_PARTNER). */
  roles: StaffRole[];
}

export type SessionState =
  { status: 'loading' } | { status: 'signedOut' } | { status: 'signedIn'; user: SessionUser };

export type LoginResult =
  | { kind: 'success'; user: SessionUser }
  | { kind: 'invalid' }
  | { kind: 'suspended' }
  | { kind: 'network' };

export interface SessionApi {
  state: SessionState;
  login(userId: string, password: string): Promise<LoginResult>;
  logout(): Promise<void>;
}
