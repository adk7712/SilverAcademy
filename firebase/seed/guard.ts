// Emulator-only guard for the seed (task 0.5). Refuses to run unless emulator hosts are set and the project is a demo project.
import { STAFF_PASSWORD_MIN } from '@silveracademy/shared';

export const DEMO_PROJECT_PREFIX = 'demo-';
export const DEFAULT_PROJECT_ID = 'demo-silveracademy';
/** Same dev defaults as .env.example. Emulator-only; never real secrets. */
const DEV_QR_HMAC_SECRET = 'dev-only-change-me';
const DEV_ADMIN_PASSWORD = 'demo-admin-2026';
const DEV_PARTNER_PASSWORD = 'demo-partner-2026';
const REQUIRED_EMULATOR_VARS = ['FIRESTORE_EMULATOR_HOST', 'FIREBASE_AUTH_EMULATOR_HOST'] as const;

export interface SeedConfig {
  projectId: string;
  qrSecret: string;
  adminPassword: string;
  partnerPassword: string;
}

export class SeedRefusedError extends Error {}

/** Validates env and returns the seed config. Throws SeedRefusedError when the target is not an emulator. */
export function loadSeedConfig(env: NodeJS.ProcessEnv): SeedConfig {
  const missing = REQUIRED_EMULATOR_VARS.filter((name) => !env[name]);
  if (missing.length > 0) {
    throw new SeedRefusedError(
      `Refusing to seed: ${missing.join(', ')} not set. Start emulators with \`npm run emulators\` ` +
        'and run the seed with both variables set (see docs/dev-guide.md).',
    );
  }
  const projectId = env.GCLOUD_PROJECT || DEFAULT_PROJECT_ID;
  if (!projectId.startsWith(DEMO_PROJECT_PREFIX)) {
    throw new SeedRefusedError(
      `Refusing to seed project "${projectId}": emulator seed only runs on "${DEMO_PROJECT_PREFIX}*" projects.`,
    );
  }
  const adminPassword = env.SEED_ADMIN_PASSWORD || DEV_ADMIN_PASSWORD;
  const partnerPassword = env.SEED_PARTNER_PASSWORD || DEV_PARTNER_PASSWORD;
  if (adminPassword.length < STAFF_PASSWORD_MIN || partnerPassword.length < STAFF_PASSWORD_MIN) {
    throw new SeedRefusedError(
      `Seed staff passwords must be at least ${STAFF_PASSWORD_MIN} characters.`,
    );
  }
  return {
    projectId,
    qrSecret: env.QR_HMAC_SECRET || DEV_QR_HMAC_SECRET,
    adminPassword,
    partnerPassword,
  };
}
