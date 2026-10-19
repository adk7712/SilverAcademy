// UC #0-2 auth-recordStaffLogin: audits web staff logins (success / failure / blocked) and syncs claims on success.
import type { Auth } from 'firebase-admin/auth';
import { AppError, type Role } from '@silveracademy/shared';
import {
  defineCallable,
  getAdminAuth,
  rateKeyPart,
  takeRateToken,
  writeAudit,
  type CallableContext,
} from '../../common';
import { AUDIT_OUTCOME_FOR, decideStaffLoginSuccess } from '../controller/staffLogin';
import { syncClaimsFromUserDoc } from '../repo/claimsRepo';
import { findStaffByUserId, getUser } from '../repo/usersRepo';

type Ctx = Pick<CallableContext<'auth-recordStaffLogin', 'public'>, 'input' | 'db' | 'uid' | 'now'>;

/** Unauthenticated reports are throttled (review M3): per known staff id, shared for unknown ids, and overall. */
export const STAFF_REPORT_LIMITS = { perStaffId: 5, unknownIds: 10, global: 60 } as const;

/**
 * FAILURE / BLOCKED: callable unauthenticated, so reports are client-reported (`details.clientReported`) and rate-limited
 * (M3); audited with null actor (the typed userId goes in `details`).
 * SUCCESS: needs a signed-in staff account whose `staffUserId` matches; audits, refreshes claims `{roles,status}`
 * (the web app must then call `getIdToken(true)` so Firestore rules see `status`) and returns roles.
 * Not staff -> audit DENIED and NOT_STAFF_ACCOUNT (web signs out).
 */
export async function recordStaffLogin(ctx: Ctx, auth: Auth): Promise<{ roles?: Role[] }> {
  const { userId, outcome } = ctx.input;
  if (outcome !== 'SUCCESS') {
    const known = await findStaffByUserId(ctx.db, userId);
    const bucket = known ? `staffLogin:u:${rateKeyPart(userId)}` : 'staffLogin:unknown';
    const limit = known ? STAFF_REPORT_LIMITS.perStaffId : STAFF_REPORT_LIMITS.unknownIds;
    const allowed =
      (await takeRateToken(ctx.db, 'staffLogin:global', STAFF_REPORT_LIMITS.global, ctx.now)) &&
      (await takeRateToken(ctx.db, bucket, limit, ctx.now));
    if (!allowed) return {}; // flood: drop silently (no oracle, no write amplification)
    await writeAudit(ctx.db, {
      actorId: null,
      actorRole: null,
      action: 'STAFF_LOGIN',
      outcome: AUDIT_OUTCOME_FOR[outcome],
      details: { userId, reported: outcome, clientReported: true, knownStaffId: !!known },
    });
    return {};
  }
  if (!ctx.uid) throw new AppError('UNAUTHENTICATED');
  const user = await getUser(ctx.db, ctx.uid);
  try {
    const roles = decideStaffLoginSuccess(user, userId);
    const claims = await syncClaimsFromUserDoc(
      ctx.db,
      auth,
      ctx.uid,
      roles,
      user?.displayName ?? userId,
    );
    // Check status before the SUCCESS audit so a suspension race records only DENIED.
    if (claims.status !== 'ACTIVE') throw new AppError('ACCOUNT_SUSPENDED');
    await writeAudit(ctx.db, {
      actorId: ctx.uid,
      actorRole: roles[0] ?? null,
      action: 'STAFF_LOGIN',
      outcome: 'SUCCESS',
      targetType: 'USER',
      targetId: ctx.uid,
      details: { userId },
    });
    return { roles };
  } catch (e) {
    if (e instanceof AppError) {
      await writeAudit(ctx.db, {
        actorId: ctx.uid,
        actorRole: user?.roles[0] ?? null,
        action: 'STAFF_LOGIN',
        outcome: 'DENIED',
        details: { userId, code: e.code },
      });
    }
    throw e;
  }
}

export const recordStaffLoginCallable = defineCallable('auth-recordStaffLogin', 'public', (ctx) =>
  recordStaffLogin(ctx, getAdminAuth()),
);
