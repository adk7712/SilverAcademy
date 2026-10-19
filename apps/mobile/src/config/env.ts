// App configuration read from EXPO_PUBLIC_* env vars (architecture.md 1.3; .env.example). Cross-cutting.
// Expo inlines only static `process.env.EXPO_PUBLIC_X` accesses, so each var is read explicitly.
export const EMULATOR_PORTS = {
  auth: 9099,
  firestore: 8080,
  functions: 5001,
  storage: 9199,
} as const;

const DEFAULT_PROJECT_ID = 'demo-silveracademy';
const DEFAULT_API_KEY = 'demo-api-key';
const DEFAULT_EMULATOR_HOST = 'localhost';

export const env = {
  /** True when EXPO_PUBLIC_USE_EMULATORS=true: Auth/Firestore/Functions point at the local emulators. */
  useEmulators: process.env.EXPO_PUBLIC_USE_EMULATORS === 'true',
  /** Android emulators need 10.0.2.2, physical devices need the dev machine's LAN IP. */
  emulatorHost: process.env.EXPO_PUBLIC_EMULATOR_HOST ?? DEFAULT_EMULATOR_HOST,
  firebase: {
    projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID ?? DEFAULT_PROJECT_ID,
    apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY ?? DEFAULT_API_KEY,
    authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
    appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
  },
} as const;
