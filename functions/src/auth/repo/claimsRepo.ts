// Firebase Auth side of login: user record + custom claims `{ roles, status }` (architecture.md 3.2). UC #0-1, #0-2.
import type { Auth } from 'firebase-admin/auth';
import type { Firestore } from 'firebase-admin/firestore';
import type { AccountStatus, Role } from '@silveracademy/shared';
import { getUser } from './usersRepo';

const USER_NOT_FOUND = 'auth/user-not-found';

export interface Claims {
  roles: Role[];
  status: AccountStatus;
}

const errorCode = (e: unknown): string =>
  typeof e === 'object' && e !== null && 'code' in e ? String((e as { code: unknown }).code) : '';

/** Creates the Auth user if missing (custom-token sign-in needs none, but claims need a record). */
async function ensureAuthUser(auth: Auth, uid: string, displayName: string): Promise<void> {
  try {
    await auth.getUser(uid);
  } catch (e) {
    if (errorCode(e) !== USER_NOT_FOUND) throw e;
    await auth.createUser({ uid, displayName });
  }
}

/** Persists claims on the Auth user. Clients must `getIdToken(true)` to see changes made after sign-in. */
async function syncClaims(
  auth: Auth,
  uid: string,
  claims: Claims,
  displayName: string,
): Promise<void> {
  await ensureAuthUser(auth, uid, displayName);
  await auth.setCustomUserClaims(uid, claims);
}

/** Custom token whose claims are copied into the first ID token (so no refresh is needed right after login). */
export const issueCustomToken = (auth: Auth, uid: string, claims: Claims): Promise<string> =>
  auth.createCustomToken(uid, { ...claims });

const SYNC_ATTEMPTS = 3;

/**
 * Claims derived from the Firestore user doc status, never a literal ACTIVE (review M2). Re-reads after writing and
 * repeats when an admin suspended/reactivated in between, so the Auth claims converge on the doc's status.
 */
export async function syncClaimsFromUserDoc(
  db: Firestore,
  auth: Auth,
  uid: string,
  roles: Role[],
  displayName: string,
): Promise<Claims> {
  let claims: Claims = { roles, status: 'ACTIVE' };
  for (let i = 0; i < SYNC_ATTEMPTS; i += 1) {
    const status = (await getUser(db, uid))?.status ?? 'ACTIVE';
    claims = { roles, status };
    await syncClaims(auth, uid, claims, displayName);
    if (((await getUser(db, uid))?.status ?? 'ACTIVE') === status) break;
  }
  return claims;
}
