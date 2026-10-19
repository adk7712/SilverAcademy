// UC #0-1 pure login helpers: picker entries and login phase state (mock Singpass, FAIL/DOWN simulation).
import {
  MOCK_DOWN_PROFILE_ID,
  MOCK_FAIL_PROFILE_ID,
  MOCK_SINGPASS_PROFILES,
  type AppError,
} from '@silveracademy/shared';
import { strings } from '../../../i18n';

export type LoginPhase =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'register'; profileId: string }
  | { kind: 'error'; error: AppError };

export interface PickerEntry {
  profileId: string;
  title: string;
  subtitle: string;
}

/** Real mock identities for the picker (excludes the simulate-failure ids). */
export const pickerEntries = (): PickerEntry[] =>
  MOCK_SINGPASS_PROFILES.map((p) => ({ profileId: p.profileId, title: p.name, subtitle: p.label }));

export const SIMULATIONS = [
  { profileId: MOCK_FAIL_PROFILE_ID, label: () => strings.auth.simulateFail },
  { profileId: MOCK_DOWN_PROFILE_ID, label: () => strings.auth.simulateDown },
] as const;
