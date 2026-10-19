// Pure session/claims helpers and route-guard decisions. UC #0-2, #5-1 (role-based access).
import { ACCOUNT_STATUSES, ROLES, STAFF_ROLES } from '@silveracademy/shared';
import type { Role, StaffRole } from '@silveracademy/shared';
import type { SessionClaims, SessionState, SessionUser } from '../types';

/** Login ids are mapped to this email domain (architecture 5.1). */
export const STAFF_EMAIL_DOMAIN = 'staff.silveracademy.test';

export const staffEmail = (userId: string): string =>
  `${userId.trim().toLowerCase()}@${STAFF_EMAIL_DOMAIN}`;

export const userIdFromEmail = (email: string | null | undefined): string =>
  (email ?? '').split('@')[0] ?? '';

const isRole = (v: unknown): v is Role => (ROLES as readonly unknown[]).includes(v);

/** Validates the raw token claims; unknown values are dropped. */
export function parseClaims(raw: Record<string, unknown> | null | undefined): SessionClaims {
  const roles = Array.isArray(raw?.roles) ? raw.roles.filter(isRole) : [];
  const status = (ACCOUNT_STATUSES as readonly unknown[]).includes(raw?.status)
    ? (raw?.status as SessionClaims['status'])
    : undefined;
  return { roles, status };
}

export const staffRolesOf = (roles: readonly Role[]): StaffRole[] =>
  STAFF_ROLES.filter((r) => roles.includes(r));

/** Web session only for ACTIVE accounts that hold a staff role; otherwise null. */
export function toSessionUser(
  uid: string,
  email: string | null | undefined,
  claims: SessionClaims,
): SessionUser | null {
  const roles = staffRolesOf(claims.roles);
  if (claims.status !== 'ACTIVE' || roles.length === 0) return null;
  return { uid, userId: userIdFromEmail(email), roles };
}

export const hasAnyRole = (held: readonly StaffRole[], allowed: readonly StaffRole[]): boolean =>
  held.some((r) => allowed.includes(r));

export type GuardDecision = 'loading' | 'login' | 'forbidden' | 'allow';

/** Route guard: wait for session, send anonymous users to login, deny wrong roles. */
export function decideGuard(state: SessionState, allowed: readonly StaffRole[]): GuardDecision {
  if (state.status === 'loading') return 'loading';
  if (state.status === 'signedOut') return 'login';
  return hasAnyRole(state.user.roles, allowed) ? 'allow' : 'forbidden';
}
