// NFR 2.1 (no dedicated UC; ADR-008): users-updatePreferences: font scale (NFR 2.1) and last active mode (ADR-008). Any signed-in role.
import { defineCallable } from '../../common';
import { updatePreferences } from '../repo/userSelfRepo';

export const updatePreferencesCallable = defineCallable(
  'users-updatePreferences',
  {},
  async ({ input, caller, db }) => updatePreferences(db, caller, input),
);
