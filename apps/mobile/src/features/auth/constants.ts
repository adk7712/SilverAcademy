// UC #0-1 constants for the fake Singpass screen (demo only).
import { MOCK_SUSPENDED_PROFILE_ID } from '@silveracademy/shared';

/** How long the fake "Approve in the Singpass app" step lasts. */
export const APPROVAL_DELAY_MS = 2000;

/** Longest ID / password the demo inputs accept. */
export const ID_MAX_LENGTH = 32;
export const PASSWORD_MAX_LENGTH = 64;

export const EDGE_PROFILE_ID = 'senior-49-edge';

/** Seed profiles kept out of the normal demo account list; reachable via "Demo tools" or by typing the ID. */
export const HIDDEN_DEMO_PROFILE_IDS: readonly string[] = [
  EDGE_PROFILE_ID,
  MOCK_SUSPENDED_PROFILE_ID,
];

/** Size of the placeholder QR box (dp). */
export const QR_PLACEHOLDER_SIZE = 200;

/** After a successful sign-in the screen keeps "Logging in" while the session loads; this frees it if that never finishes. */
export const SESSION_HYDRATE_FALLBACK_MS = 15000;
