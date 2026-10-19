// Staff login flow (UC #0-2): sign in, audit via auth-recordStaffLogin, then force a token refresh.
import type { StaffLoginOutcome } from '@silveracademy/shared';
import { isAppError } from '@silveracademy/shared';
import type { LoginResult, SessionClaims } from '../types';
import { staffEmail, toSessionUser } from './guards';

/** Side effects, injected so the flow is unit-testable without Firebase. */
export interface StaffLoginDeps {
  signIn(email: string, password: string): Promise<void>;
  signOut(): Promise<void>;
  recordLogin(userId: string, outcome: StaffLoginOutcome): Promise<void>;
  /** getIdToken(true) then read claims; required after recordStaffLogin SUCCESS (handoff 1.1). */
  refreshClaims(): Promise<{ uid: string; email: string | null; claims: SessionClaims } | null>;
}

const NETWORK_AUTH_CODES = ['auth/network-request-failed', 'auth/too-many-requests'];

/** Firebase Auth error code -> audit outcome (`null` = could not reach the server). */
export function outcomeForSignInError(e: unknown): StaffLoginOutcome | null {
  const code = typeof e === 'object' && e !== null ? (e as { code?: unknown }).code : undefined;
  if (code === 'auth/user-disabled') return 'BLOCKED';
  if (typeof code === 'string' && NETWORK_AUTH_CODES.includes(code)) return null;
  return 'FAILURE';
}

/** Audit is best effort on failure paths: it must never change what the user sees. */
async function auditQuietly(deps: StaffLoginDeps, userId: string, outcome: StaffLoginOutcome) {
  try {
    await deps.recordLogin(userId, outcome);
  } catch {
    /* ignored on purpose */
  }
}

async function denyAfterSignIn(deps: StaffLoginDeps, result: LoginResult): Promise<LoginResult> {
  await deps.signOut().catch(() => undefined);
  return result;
}

export async function performStaffLogin(
  deps: StaffLoginDeps,
  userIdInput: string,
  password: string,
): Promise<LoginResult> {
  const userId = userIdInput.trim().toLowerCase();
  try {
    await deps.signIn(staffEmail(userId), password);
  } catch (e) {
    const outcome = outcomeForSignInError(e);
    if (outcome === null) return { kind: 'network' };
    await auditQuietly(deps, userId, outcome);
    return { kind: outcome === 'BLOCKED' ? 'suspended' : 'invalid' };
  }

  try {
    await deps.recordLogin(userId, 'SUCCESS');
  } catch (e) {
    if (isAppError(e) && e.code === 'ACCOUNT_SUSPENDED') {
      return denyAfterSignIn(deps, { kind: 'suspended' });
    }
    if (isAppError(e) && e.code === 'INTERNAL' && e.details?.network === true) {
      return denyAfterSignIn(deps, { kind: 'network' });
    }
    // NOT_STAFF_ACCOUNT, PERMISSION_DENIED, anything else: stay generic.
    return denyAfterSignIn(deps, { kind: 'invalid' });
  }

  const fresh = await deps.refreshClaims();
  const user = fresh && toSessionUser(fresh.uid, fresh.email, fresh.claims);
  if (!user) {
    const suspended = fresh?.claims.status !== undefined && fresh.claims.status !== 'ACTIVE';
    return denyAfterSignIn(deps, { kind: suspended ? 'suspended' : 'invalid' });
  }
  return { kind: 'success', user };
}
