// Firebase Auth side of admin account actions (UC #5-1): disabled flag, claims `{roles,status}`, token revocation.
import type { Auth } from 'firebase-admin/auth';
import type { AccountStatus, Role } from '@silveracademy/shared';

const AUTH_USER_NOT_FOUND = 'auth/user-not-found';

const errorCode = (e: unknown): string =>
  typeof e === 'object' && e !== null && 'code' in e ? String((e as { code: unknown }).code) : '';

/**
 * SUSPENDED -> Auth user disabled, claims status SUSPENDED, refresh tokens revoked (existing sessions end).
 * ACTIVE -> enabled and claims refreshed. A missing Auth user (never signed in) needs nothing and is ignored.
 */
export async function applyAccountAuthState(
  auth: Auth,
  uid: string,
  state: { roles: Role[]; status: AccountStatus },
): Promise<void> {
  try {
    await auth.updateUser(uid, { disabled: state.status === 'SUSPENDED' });
    await auth.setCustomUserClaims(uid, { roles: state.roles, status: state.status });
    if (state.status === 'SUSPENDED') await auth.revokeRefreshTokens(uid);
  } catch (e) {
    if (errorCode(e) !== AUTH_USER_NOT_FOUND) throw e;
  }
}
