// Web env parsing for Firebase client setup (architecture 5.1; emulator-first). Pure so it can be unit tested.
export const EMULATOR_PORTS = {
  auth: 9099,
  firestore: 8080,
  functions: 5001,
  storage: 9199,
} as const;

/** Placeholder web API key; the emulators accept any value. */
const EMULATOR_API_KEY = 'demo-api-key';
const DEFAULT_PROJECT_ID = 'demo-silveracademy';
const DEFAULT_EMULATOR_HOST = 'localhost';

export interface WebEnv {
  useEmulators: boolean;
  projectId: string;
  emulatorHost: string;
  apiKey: string;
}

type RawEnv = Readonly<Record<string, string | boolean | undefined>>;

const text = (v: string | boolean | undefined): string | undefined =>
  typeof v === 'string' && v.trim() !== '' ? v.trim() : undefined;

/** Reads the Vite env (`VITE_*`). Emulators are on unless `VITE_USE_EMULATORS` is `false`. */
export function readEnv(raw: RawEnv): WebEnv {
  const useEmulators = text(raw.VITE_USE_EMULATORS)?.toLowerCase() !== 'false';
  return {
    useEmulators,
    projectId: text(raw.VITE_FIREBASE_PROJECT_ID) ?? DEFAULT_PROJECT_ID,
    emulatorHost: text(raw.VITE_EMULATOR_HOST) ?? DEFAULT_EMULATOR_HOST,
    apiKey: text(raw.VITE_FIREBASE_API_KEY) ?? EMULATOR_API_KEY,
  };
}

export const env: WebEnv = readEnv(import.meta.env);
