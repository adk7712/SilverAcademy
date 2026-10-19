// UC #0-1 preferences: pure merge for users-updatePreferences (font scale NFR 2.1, last mode ADR-008). No Firebase imports.
import {
  AppError,
  type AppMode,
  type FontScale,
  type Role,
  type UserPrefs,
} from '@silveracademy/shared';

export interface PreferencesPatch {
  fontScale?: FontScale | undefined;
  lastMode?: AppMode | undefined;
}

/** `lastMode` must be a held role, else INVALID_INPUT with fieldErrors.lastMode. Returns the merged prefs. */
export function decidePreferences(
  current: UserPrefs,
  roles: Role[],
  patch: PreferencesPatch,
): UserPrefs {
  if (patch.lastMode !== undefined && !roles.includes(patch.lastMode)) {
    throw new AppError('INVALID_INPUT', 'lastMode must be a role you hold.', {
      fieldErrors: { lastMode: ['Not a role held by this account.'] },
    });
  }
  const next: UserPrefs = { ...current };
  if (patch.fontScale !== undefined) next.fontScale = patch.fontScale;
  if (patch.lastMode !== undefined) next.lastMode = patch.lastMode;
  return next;
}
