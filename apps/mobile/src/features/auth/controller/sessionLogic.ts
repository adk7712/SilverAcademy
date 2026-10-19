// UC #0-1 / FR 1.3 pure session rules: claim parsing, mode eligibility and mode resolution (ADR-008).
import { ACCOUNT_STATUSES, ROLES, type AccountStatus, type Role } from '@silveracademy/shared';
import type { SessionClaims, ShellMode } from '../types';

/** Order matters: it is the default preference when no stored mode is valid. */
export const SHELL_MODES: readonly ShellMode[] = ['LEARNER', 'SENIOR_INSTRUCTOR', 'VOLUNTEER'];

const isRole = (v: unknown): v is Role => (ROLES as readonly unknown[]).includes(v);
const isStatus = (v: unknown): v is AccountStatus =>
  (ACCOUNT_STATUSES as readonly unknown[]).includes(v);

/**
 * Reads the `{ roles, status }` custom claims (architecture.md 3.2). A missing status counts as ACTIVE
 * because the server re-checks every write; the UI only uses it to block obviously suspended users.
 */
export function parseClaims(claims: Record<string, unknown> | null | undefined): SessionClaims {
  const rawRoles = Array.isArray(claims?.roles) ? (claims.roles as unknown[]) : [];
  return {
    roles: rawRoles.filter(isRole),
    status: isStatus(claims?.status) ? claims.status : 'ACTIVE',
  };
}

/**
 * Offline cold start (NFR 4.5, review H2): a failed token refresh must not block the session. Returns the live
 * claims when the fetch works (and hands them to `remember`), else the last cached claims, else null.
 */
export async function claimsWithFallback(
  fetchClaims: () => Promise<Record<string, unknown> | null>,
  cached: Record<string, unknown> | null,
  remember: (claims: Record<string, unknown>) => void,
): Promise<Record<string, unknown> | null> {
  try {
    const live = await fetchClaims();
    if (live) remember(live);
    return live;
  } catch {
    return cached;
  }
}

/** Resolves to `fallback` if `work` rejects or takes longer than `ms` (offline reads can hang). */
export function orFallback<T>(work: Promise<T>, ms: number, fallback: T): Promise<T> {
  return new Promise<T>((resolve) => {
    const timer = setTimeout(() => resolve(fallback), ms);
    work.then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      () => {
        clearTimeout(timer);
        resolve(fallback);
      },
    );
  });
}

export const availableModes = (roles: readonly Role[]): ShellMode[] =>
  SHELL_MODES.filter((mode) => roles.includes(mode));

/** Learner/Instructor toggle is shown only for users who hold both roles (50+ eligible). */
export const canToggleMode = (roles: readonly Role[]): boolean =>
  roles.includes('LEARNER') && roles.includes('SENIOR_INSTRUCTOR');

/** Picks the stored mode if still valid, else the first available mode, else null (no mobile shell). */
export function resolveMode(roles: readonly Role[], preferred: unknown): ShellMode | null {
  const modes = availableModes(roles);
  const match = modes.find((m) => m === preferred);
  return match ?? modes[0] ?? null;
}
