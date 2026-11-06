// UC #0-1 pure login helpers: login phase state and the demo account list (mock Singpass).
import { MOCK_SINGPASS_PROFILES, type AppError } from '@silveracademy/shared';
import { HIDDEN_DEMO_PROFILE_IDS } from '../constants';

/** `exchange`: server call in flight (safe to leave). `session`: token sign-in started, waiting for the session to load (not leavable). */
export type LoadingStage = 'exchange' | 'session';

export type LoginPhase =
  | { kind: 'idle' }
  | { kind: 'loading'; stage: LoadingStage }
  | { kind: 'register'; profileId: string }
  | { kind: 'error'; error: AppError };

/** Back (and Android back) stays available during the server exchange; the generation token makes leaving safe. */
export const canLeaveWhileLoading = (stage: LoadingStage): boolean => stage === 'exchange';

export type HydrateFallbackDecision = 'ignore' | 'signOutAndFail';

/** Timer rule: only the still-current attempt signs out and fails; a stale one (left, reset, unmounted) does nothing. */
export const decideHydrateFallback = (attemptIsCurrent: boolean): HydrateFallbackDecision =>
  attemptIsCurrent ? 'signOutAndFail' : 'ignore';

export interface PickerEntry {
  profileId: string;
  title: string;
  subtitle: string;
}

/** Demo accounts shown on the fake Singpass screen; edge-case and suspended profiles live under "Demo tools". */
export const pickerEntries = (): PickerEntry[] =>
  MOCK_SINGPASS_PROFILES.filter((p) => !HIDDEN_DEMO_PROFILE_IDS.includes(p.profileId)).map((p) => ({
    profileId: p.profileId,
    title: p.name,
    subtitle: p.label,
  }));
