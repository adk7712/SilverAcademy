// Shared seed plan types (task 0.5). A plan is pure data; apply.ts performs the writes.
import type { Role } from '@silveracademy/shared';

/** One Firestore doc to write with set() (full overwrite, so reruns are idempotent). */
export interface SeedDoc {
  path: string;
  data: object;
}

/** One Firebase Auth user; uid matches the users/{uid} doc id. */
export interface AuthUserSpec {
  uid: string;
  displayName: string;
  roles: Role[];
  email?: string;
  password?: string;
}

export interface SeedPlan {
  authUsers: AuthUserSpec[];
  docs: SeedDoc[];
}

export const seedDoc = (path: string, data: object): SeedDoc => ({ path, data });
