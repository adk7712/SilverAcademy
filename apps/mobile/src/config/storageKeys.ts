// Local persistence keys (AsyncStorage). Versioned so shape changes never read stale data. Cross-cutting.
export const STORAGE_KEYS = {
  fontScale: 'prefs:fontScale:v1',
  /** Per-user UI mode (ADR-008); use `modeKey(uid)`. */
  modePrefix: 'prefs:mode:v1:',
  /** Last known `{ roles, status }` claims per user, for offline cold starts (NFR 4.5); `claimsKey(uid)`. */
  claimsPrefix: 'session:claims:v1:',
} as const;

export const claimsKey = (uid: string) => `${STORAGE_KEYS.claimsPrefix}${uid}`;
export const modeKey = (uid: string) => `${STORAGE_KEYS.modePrefix}${uid}`;
