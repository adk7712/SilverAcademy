// UC #0-2 pure decisions for auth-recordStaffLogin (architecture.md 5.1). No Firebase imports.
import {
  AppError,
  STAFF_ROLES,
  type AuditOutcome,
  type Role,
  type StaffLoginOutcome,
  type User,
} from '@silveracademy/shared';

/** Reported client outcome -> stored audit outcome. BLOCKED (suspended, Auth disabled) is a denial. */
export const AUDIT_OUTCOME_FOR: Record<StaffLoginOutcome, AuditOutcome> = {
  SUCCESS: 'SUCCESS',
  FAILURE: 'FAILURE',
  BLOCKED: 'DENIED',
};

/**
 * A SUCCESS report is only valid for an ACTIVE staff account (ADMIN / COMMUNITY_PARTNER) whose
 * `staffUserId` equals the reported `userId`. Order: no user doc or not staff or id mismatch -> NOT_STAFF_ACCOUNT;
 * status != ACTIVE -> ACCOUNT_SUSPENDED.
 */
export function decideStaffLoginSuccess(user: User | undefined, userId: string): Role[] {
  const isStaff =
    !!user &&
    user.authType === 'STAFF' &&
    user.staffUserId?.toLowerCase() === userId.toLowerCase() &&
    user.roles.some((r) => (STAFF_ROLES as readonly string[]).includes(r));
  if (!user || !isStaff) throw new AppError('NOT_STAFF_ACCOUNT');
  if (user.status !== 'ACTIVE') throw new AppError('ACCOUNT_SUSPENDED');
  return [...user.roles];
}
