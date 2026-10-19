// UC #5-1 ManageAccounts: pure decision for users-setAccountStatus (ADR-021). No Firebase imports.
import {
  AppError,
  type AccountAction,
  type AccountStatus,
  type AuditAction,
  type User,
} from '@silveracademy/shared';

export interface AccountActionInput {
  action: AccountAction;
  reason?: string | undefined;
  expectedVersion: number;
}

export interface AccountActionDecision {
  status: AccountStatus;
  flagged: boolean;
  /** null = remove the stored flagReason. */
  flagReason: string | null;
  version: number;
  auditAction: AuditAction;
  /** SUSPEND / REACTIVATE change Firebase Auth (disabled flag, claims, token revocation). */
  touchesAuth: boolean;
  /** True when the action is a repair: state already matches, only the Auth step is re-applied (review M1). */
  resync: boolean;
  notice: { title: string; body: string };
}

const REASON_ACTIONS: readonly AccountAction[] = ['FLAG', 'SUSPEND'];
const AUDIT_FOR: Record<AccountAction, AuditAction> = {
  FLAG: 'ACCOUNT_FLAG',
  UNFLAG: 'ACCOUNT_UNFLAG',
  SUSPEND: 'ACCOUNT_SUSPEND',
  REACTIVATE: 'ACCOUNT_REACTIVATE',
};
const NOTICE_FOR: Record<AccountAction, { title: string; body: string }> = {
  FLAG: { title: 'Account flagged', body: 'Your account has been flagged for review by an admin.' },
  UNFLAG: { title: 'Flag removed', body: 'The flag on your account has been removed.' },
  SUSPEND: { title: 'Account suspended', body: 'Your account has been suspended by an admin.' },
  REACTIVATE: { title: 'Account reactivated', body: 'Your account is active again.' },
};

/**
 * Check order: target missing -> NOT_FOUND; target holds ADMIN or is the actor -> CANNOT_TARGET_ADMIN (ADR-021);
 * version mismatch -> STALE_VERSION; FLAG / SUSPEND without reason -> REASON_REQUIRED;
 * action not valid for the current state -> INVALID_TRANSITION.
 * SUSPEND on a SUSPENDED user and REACTIVATE on an ACTIVE user are idempotent repairs (`resync`): no state change,
 * no version bump, no notice; only the Firebase Auth step is re-applied so a retry after a failed Auth update heals it.
 */
export function decideAccountAction(
  target: User | undefined,
  actorUid: string,
  input: AccountActionInput,
): AccountActionDecision {
  if (!target) throw new AppError('NOT_FOUND');
  if (target.uid === actorUid || target.roles.includes('ADMIN')) {
    throw new AppError('CANNOT_TARGET_ADMIN');
  }
  if (target.version !== input.expectedVersion) {
    throw new AppError('STALE_VERSION', undefined, { currentVersion: target.version });
  }
  const reason = input.reason?.trim();
  if (REASON_ACTIONS.includes(input.action) && !reason) throw new AppError('REASON_REQUIRED');

  const { action } = input;
  const invalid =
    (action === 'FLAG' && target.flagged) ||
    (action === 'UNFLAG' && !target.flagged) ||
    (action === 'REACTIVATE' && target.status !== 'SUSPENDED' && target.status !== 'ACTIVE');
  if (invalid) throw new AppError('INVALID_TRANSITION', undefined, { status: target.status });
  const resync =
    (action === 'SUSPEND' && target.status === 'SUSPENDED') ||
    (action === 'REACTIVATE' && target.status === 'ACTIVE');
  if (resync) {
    return {
      status: target.status,
      flagged: target.flagged,
      flagReason: target.flagReason ?? null,
      version: target.version,
      auditAction: AUDIT_FOR[action],
      touchesAuth: true,
      resync: true,
      notice: NOTICE_FOR[action],
    };
  }

  const suspend = action === 'SUSPEND';
  const reactivate = action === 'REACTIVATE';
  const flagged = action === 'FLAG' ? true : action === 'UNFLAG' ? false : target.flagged;
  return {
    status: suspend ? 'SUSPENDED' : reactivate ? 'ACTIVE' : target.status,
    flagged,
    flagReason: flagged
      ? action === 'FLAG'
        ? (reason ?? null)
        : (target.flagReason ?? null)
      : null,
    version: target.version + 1,
    auditAction: AUDIT_FOR[action],
    touchesAuth: suspend || reactivate,
    resync: false,
    notice: NOTICE_FOR[action],
  };
}
