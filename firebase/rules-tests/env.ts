// Shared rules-test harness: one RulesTestEnvironment against the Firestore + Storage emulators (docs/architecture.md section 3).
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  initializeTestEnvironment,
  type RulesTestContext,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';

export const PROJECT_ID = 'demo-silveracademy-rules';
const RULES_DIR = join(__dirname, '..');

export type Role = 'LEARNER' | 'SENIOR_INSTRUCTOR' | 'VOLUNTEER' | 'COMMUNITY_PARTNER' | 'ADMIN';

export const ids = {
  learner: 'u-learner',
  other: 'u-other',
  instructor: 'u-instructor',
  volunteer: 'u-volunteer',
  partner: 'u-partner',
  admin: 'u-admin',
  suspended: 'u-suspended',
} as const;

/** Claims exactly as the auth functions set them. */
export const claims = (roles: Role[], status = 'ACTIVE') => ({ roles, status });

export async function createEnv(): Promise<RulesTestEnvironment> {
  return initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: { rules: readFileSync(join(RULES_DIR, 'firestore.rules'), 'utf8') },
    storage: { rules: readFileSync(join(RULES_DIR, 'storage.rules'), 'utf8') },
  });
}

export const as = (
  env: RulesTestEnvironment,
  uid: string,
  roles: Role[],
  status = 'ACTIVE',
): RulesTestContext => env.authenticatedContext(uid, claims(roles, status));

/** One caller per persona. `anon` has no auth. `noStatus` has roles but no status claim (stale token). */
export function personas(env: RulesTestEnvironment) {
  return {
    anon: env.unauthenticatedContext(),
    learner: as(env, ids.learner, ['LEARNER']),
    other: as(env, ids.other, ['LEARNER']),
    instructor: as(env, ids.instructor, ['LEARNER', 'SENIOR_INSTRUCTOR']),
    volunteer: as(env, ids.volunteer, ['VOLUNTEER']),
    partner: as(env, ids.partner, ['COMMUNITY_PARTNER']),
    admin: as(env, ids.admin, ['ADMIN']),
    suspended: as(env, ids.suspended, ['LEARNER'], 'SUSPENDED'),
    noStatus: env.authenticatedContext(ids.learner, { roles: ['LEARNER'] }),
  };
}
