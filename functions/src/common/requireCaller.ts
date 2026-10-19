// requireCaller: authenticates the caller against users/{uid} (source of truth, not token claims). architecture.md 3.2.
import type { Firestore } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions/v2';
import { AppError, type Role, type User } from '@silveracademy/shared';
import { writeAudit } from './audit';
import { COL } from './refs';

export interface CallerOptions {
  /** Caller must hold at least one of these. Omit for "any signed-in role". */
  roles?: readonly Role[];
  /** Default true: status must be ACTIVE else ACCOUNT_SUSPENDED. */
  requireActive?: boolean;
  /** Write an auditLogs PERMISSION_DENIED entry when the check fails for a known user (admin callables). */
  auditOnDeny?: boolean;
}

export interface Caller {
  uid: string;
  user: User;
  roles: Role[];
}

/**
 * Pure decision. Order: no auth or no user doc -> UNAUTHENTICATED; status not ACTIVE -> ACCOUNT_SUSPENDED;
 * role mismatch -> PERMISSION_DENIED.
 */
export function decideCaller(
  uid: string | undefined,
  user: User | undefined,
  opts: Pick<CallerOptions, 'roles' | 'requireActive'> = {},
): Caller {
  if (!uid || !user) throw new AppError('UNAUTHENTICATED');
  if ((opts.requireActive ?? true) && user.status !== 'ACTIVE') {
    throw new AppError('ACCOUNT_SUSPENDED');
  }
  const held = user.roles ?? [];
  if (opts.roles && !opts.roles.some((r) => held.includes(r))) {
    throw new AppError('PERMISSION_DENIED');
  }
  return { uid, user, roles: [...held] };
}

export type UserLoader = (uid: string) => Promise<User | undefined>;

export const firestoreUserLoader =
  (db: Firestore): UserLoader =>
  async (uid) => {
    const snap = await db.collection(COL.users).doc(uid).get();
    return snap.exists ? (snap.data() as User) : undefined;
  };

export interface RequireCallerDeps {
  loadUser: UserLoader;
  /** Called on a denial when `auditOnDeny` and the user is known. */
  auditDenied?: (entry: { uid: string; roles: Role[]; code: string }) => Promise<void>;
}

/** Testable core: inject how the user is loaded and how denials are audited. */
export async function requireCallerWith(
  deps: RequireCallerDeps,
  uid: string | undefined,
  opts: CallerOptions = {},
): Promise<Caller> {
  const user = uid ? await deps.loadUser(uid) : undefined;
  try {
    return decideCaller(uid, user, opts);
  } catch (e) {
    if (opts.auditOnDeny && uid && user && e instanceof AppError) {
      try {
        await deps.auditDenied?.({ uid, roles: user.roles ?? [], code: e.code });
      } catch (auditError) {
        // The caller must still see the original denial, not an audit failure.
        logger.error('Denial audit failed', auditError);
      }
    }
    throw e;
  }
}

/**
 * Standard entry check for every authenticated callable. `callableName` only labels the denial audit entry.
 * `uid` is `request.auth?.uid`.
 */
export function requireCaller(
  db: Firestore,
  uid: string | undefined,
  opts: CallerOptions = {},
  callableName = 'unknown',
): Promise<Caller> {
  return requireCallerWith(
    {
      loadUser: firestoreUserLoader(db),
      auditDenied: async ({ uid: actorId, roles, code }) => {
        await writeAudit(db, {
          actorId,
          actorRole: roles[0] ?? null,
          action: 'PERMISSION_DENIED',
          outcome: 'DENIED',
          details: { callable: callableName, code },
        });
      },
    },
    uid,
    opts,
  );
}
