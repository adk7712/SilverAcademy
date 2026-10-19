// UC #0-1 Local view models for auth; entity types come from @silveracademy/shared.
import type { AccountStatus, AppMode, Role } from '@silveracademy/shared';

/** Modes the mobile shell can render (staff modes live in the web app). */
export type ShellMode = Extract<AppMode, 'LEARNER' | 'SENIOR_INSTRUCTOR' | 'VOLUNTEER'>;

export interface SessionClaims {
  roles: Role[];
  status: AccountStatus;
}

export type SessionState =
  | { status: 'loading' }
  | { status: 'signedOut' }
  | {
      status: 'signedIn';
      uid: string;
      displayName: string;
      roles: Role[];
      accountStatus: AccountStatus;
      /** Active UI mode; null when the roles have no mobile shell (staff accounts). */
      mode: ShellMode | null;
    };

export interface SessionApi {
  state: SessionState;
  /** Modes this user may switch between (empty for staff). */
  modes: ShellMode[];
  /** True only for users holding both LEARNER and SENIOR_INSTRUCTOR (age 50+, FR 1.3). */
  canToggleMode: boolean;
  setMode: (mode: ShellMode) => void;
  /** Re-reads claims with a forced token refresh (e.g. after approval or on app foreground). */
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
}

export interface UserSummary {
  displayName: string;
  lastMode?: unknown;
}
