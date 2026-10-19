// UC #0-1 pure decision for auth-exchangeSingpass (architecture.md 5.1, ADR-008). No Firebase imports.
import { createHash } from 'node:crypto';
import {
  AppError,
  SENIOR_MIN_AGE,
  ageInYears,
  type RegisterAs,
  type Role,
  type SingpassIdentity,
  type User,
} from '@silveracademy/shared';

const UID_PREFIX = 'sp_';
const UID_HASH_LENGTH = 20;

/** `sp_` + first 20 hex chars of sha256(sub). Same derivation as the seed. */
export const singpassUid = (sub: string): string =>
  UID_PREFIX + createHash('sha256').update(sub).digest('hex').slice(0, UID_HASH_LENGTH);

export interface SingpassLoginInput {
  identity: SingpassIdentity;
  existing: Pick<User, 'roles' | 'status'> | undefined;
  registerAs: RegisterAs | undefined;
  now: Date;
}

export interface SingpassLoginDecision {
  isNewUser: boolean;
  roles: Role[];
  seniorEligible: boolean;
}

/**
 * Check order: DOB unreadable -> PROFILE_UNAVAILABLE; existing but status != ACTIVE -> ACCOUNT_SUSPENDED;
 * new and no registerAs -> REGISTRATION_REQUIRED.
 * New: LEARNER (+ SENIOR_INSTRUCTOR when age >= SENIOR_MIN_AGE) or VOLUNTEER.
 * Existing: SENIOR_INSTRUCTOR is added/removed to match eligibility for users holding LEARNER; other roles are kept.
 */
export function decideSingpassLogin(input: SingpassLoginInput): SingpassLoginDecision {
  const age = ageInYears(input.identity.dateOfBirth, input.now);
  if (age === null) throw new AppError('PROFILE_UNAVAILABLE');
  const seniorEligible = age >= SENIOR_MIN_AGE;

  if (!input.existing) {
    if (!input.registerAs) throw new AppError('REGISTRATION_REQUIRED');
    const roles: Role[] = [input.registerAs];
    if (input.registerAs === 'LEARNER' && seniorEligible) roles.push('SENIOR_INSTRUCTOR');
    return { isNewUser: true, roles, seniorEligible };
  }

  if (input.existing.status !== 'ACTIVE') throw new AppError('ACCOUNT_SUSPENDED');
  let roles = [...input.existing.roles];
  if (roles.includes('LEARNER')) {
    roles = roles.filter((r) => r !== 'SENIOR_INSTRUCTOR');
    if (seniorEligible) roles.push('SENIOR_INSTRUCTOR');
  }
  return { isNewUser: false, roles, seniorEligible };
}
