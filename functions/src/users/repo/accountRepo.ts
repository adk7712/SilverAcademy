// users/{uid} admin writes (UC #5-1 flag/suspend/reactivate). Admin SDK only; rules live in ../controller.
import type { Auth } from 'firebase-admin/auth';
import { FieldValue, type Firestore } from 'firebase-admin/firestore';
import type { AccountStatus, User } from '@silveracademy/shared';
import { COL, runTx, notifyTx, paths, writeAudit, writeAuditTx } from '../../common';
import type { Caller } from '../../common';
import { decideAccountAction, type AccountActionInput } from '../controller/decideAccountAction';
import { applyAccountAuthState } from './accountAuthRepo';

export interface SetAccountStatusResult {
  status: AccountStatus;
  flagged: boolean;
  version: number;
}

/**
 * One transaction: read target, decide, update user (+version), audit, notify target.
 * After commit, SUSPEND / REACTIVATE apply the Auth state. Access is already blocked by requireCaller (reads
 * users/{uid}) even if the Auth step fails; the error then surfaces as INTERNAL and the admin simply repeats the same
 * action: SUSPEND on SUSPENDED / REACTIVATE on ACTIVE re-apply only the Auth step (resync, no version bump).
 */
export async function setAccountStatus(
  db: Firestore,
  auth: Auth,
  caller: Pick<Caller, 'uid' | 'roles'>,
  input: AccountActionInput & { uid: string },
): Promise<SetAccountStatusResult> {
  const ref = db.collection(COL.users).doc(input.uid);
  const { decision, roles } = await runTx(db, async (tx) => {
    const snap = await tx.get(ref);
    const target = snap.exists ? (snap.data() as User) : undefined;
    const d = decideAccountAction(target, caller.uid, input);
    if (!d.resync) {
      tx.update(ref, {
        status: d.status,
        flagged: d.flagged,
        flagReason: d.flagReason ?? FieldValue.delete(),
        version: d.version,
        updatedAt: FieldValue.serverTimestamp(),
      });
    }
    writeAuditTx(db, tx, {
      actorId: caller.uid,
      actorRole: 'ADMIN',
      action: d.auditAction,
      outcome: 'SUCCESS',
      targetType: 'USER',
      targetId: input.uid,
      details: {
        ...(input.reason?.trim() ? { reason: input.reason.trim() } : {}),
        status: d.status,
        flagged: d.flagged,
        ...(d.resync ? { resync: true } : {}),
      },
    });
    if (!d.resync) {
      notifyTx(db, tx, {
        userId: input.uid,
        type: 'ACCOUNT_STATUS_CHANGED',
        title: d.notice.title,
        body: d.notice.body,
        refPath: paths.user(input.uid),
      });
    }
    return { decision: d, roles: (target as User).roles };
  });
  if (decision.touchesAuth) {
    try {
      await applyAccountAuthState(auth, input.uid, { roles, status: decision.status });
    } catch (e) {
      // Firestore already holds the new status; record the half-applied state and let the admin retry (M1).
      await writeAudit(db, {
        actorId: caller.uid,
        actorRole: 'ADMIN',
        action: decision.auditAction,
        outcome: 'FAILURE',
        targetType: 'USER',
        targetId: input.uid,
        details: { authSyncFailed: true, status: decision.status },
      }).catch(() => undefined);
      throw e;
    }
  }
  return { status: decision.status, flagged: decision.flagged, version: decision.version };
}
