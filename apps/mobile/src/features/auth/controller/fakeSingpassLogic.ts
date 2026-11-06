// UC #0-1 pure fake-Singpass logic: typed-ID check (local only), screen states, demo-tool simulations.
import {
  MOCK_DOWN_PROFILE_ID,
  MOCK_FAIL_PROFILE_ID,
  MOCK_SINGPASS_PROFILES,
  MOCK_SUSPENDED_PROFILE_ID,
  type AppError,
} from '@silveracademy/shared';
import { strings } from '../../../i18n';
import { EDGE_PROFILE_ID } from '../constants';
import type { LoadingStage, LoginPhase } from './loginLogic';

export type IdFieldError = 'idRequired' | 'idUnknown';
export type PasswordFieldError = 'passwordRequired';

export type IdLoginCheck =
  | { ok: true; profileId: string }
  | { ok: false; idError?: IdFieldError; passwordError?: PasswordFieldError };

/**
 * Maps typed text to a seed profile id: trimmed, case-insensitive, known seed ids only (FAIL/DOWN are not typeable).
 * Returns the canonical id, or null. Unknown text must never be sent to the server.
 */
export function resolveTypedProfileId(raw: string): string | null {
  const typed = raw.trim().toLowerCase();
  if (typed === '') return null;
  return MOCK_SINGPASS_PROFILES.find((p) => p.profileId.toLowerCase() === typed)?.profileId ?? null;
}

/**
 * Client check for the ID + password tab. The password only has to be non-empty: it is not compared, returned,
 * stored or logged. On failure nothing leaves the device.
 */
export function checkIdLogin(rawId: string, password: string): IdLoginCheck {
  const profileId = resolveTypedProfileId(rawId);
  const idError: IdFieldError | undefined =
    rawId.trim() === '' ? 'idRequired' : profileId === null ? 'idUnknown' : undefined;
  const passwordError: PasswordFieldError | undefined =
    password.length === 0 ? 'passwordRequired' : undefined;
  if (profileId !== null && !passwordError) return { ok: true, profileId };
  return { ok: false, idError, passwordError };
}

export const idErrorMessage = (e: IdFieldError | undefined): string | undefined =>
  e ? strings.auth[e] : undefined;
export const passwordErrorMessage = (e: PasswordFieldError | undefined): string | undefined =>
  e ? strings.auth[e] : undefined;

export type FakeSingpassScreenState =
  | { kind: 'idle' }
  | { kind: 'approving'; profileId: string }
  | { kind: 'signingIn'; stage: LoadingStage }
  | { kind: 'register'; profileId: string }
  | { kind: 'error'; error: AppError };

/** Screen state from the login phase plus the pending approval (if any). Approval wins: nothing else can be showing. */
export function deriveScreenState(
  phase: LoginPhase,
  approvingProfileId: string | null,
): FakeSingpassScreenState {
  if (approvingProfileId !== null) return { kind: 'approving', profileId: approvingProfileId };
  switch (phase.kind) {
    case 'loading':
      return { kind: 'signingIn', stage: phase.stage };
    case 'register':
      return { kind: 'register', profileId: phase.profileId };
    case 'error':
      return { kind: 'error', error: phase.error };
    default:
      return { kind: 'idle' };
  }
}

/**
 * Demo-tool simulations (hidden by default). They skip the approval delay: they are pre-baked edge cases, so the
 * presenter sees the outcome straight away instead of waiting on a step that adds nothing.
 */
export const SIMULATIONS = [
  { profileId: EDGE_PROFILE_ID, label: () => strings.auth.simulateEdge },
  { profileId: MOCK_SUSPENDED_PROFILE_ID, label: () => strings.auth.simulateSuspended },
  { profileId: MOCK_DOWN_PROFILE_ID, label: () => strings.auth.simulateDown },
  { profileId: MOCK_FAIL_PROFILE_ID, label: () => strings.auth.simulateFail },
] as const;
