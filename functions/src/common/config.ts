// Runtime configuration read from env (functions/.env.local in the emulator). Cross-cutting, architecture.md 5.1, 4.2, 4.3.
export type AuthMode = 'mock' | 'singpass';

const DEV_QR_SECRET = 'dev-only-change-me';

export const isEmulator = (env: NodeJS.ProcessEnv = process.env): boolean =>
  env.FUNCTIONS_EMULATOR === 'true' || !!env.FIRESTORE_EMULATOR_HOST;

/** `mock` in emulators by default; anywhere else it must be set explicitly (mock is refused outside emulators). */
export function authMode(env: NodeJS.ProcessEnv = process.env): AuthMode {
  const raw = env.AUTH_MODE ?? (isEmulator(env) ? 'mock' : 'singpass');
  if (raw !== 'mock' && raw !== 'singpass') throw new Error(`Invalid AUTH_MODE "${raw}"`);
  if (raw === 'mock' && !isEmulator(env))
    throw new Error('AUTH_MODE=mock is only allowed in the emulators');
  return raw;
}

/** HMAC key for QR payloads. A dev default exists only in emulators. */
export function qrSecret(env: NodeJS.ProcessEnv = process.env): string {
  const secret = env.QR_HMAC_SECRET;
  if (secret) return secret;
  if (isEmulator(env)) return DEV_QR_SECRET;
  throw new Error('QR_HMAC_SECRET is not configured');
}

/** Demo switch that bypasses the attendance check-in window (ADR-009). Honoured only in emulators (review L10). */
export const ignoreCheckInWindow = (env: NodeJS.ProcessEnv = process.env): boolean =>
  env.DEMO_IGNORE_CHECKIN_WINDOW === 'true' && isEmulator(env);
