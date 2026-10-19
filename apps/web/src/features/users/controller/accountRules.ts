// UC #5-1 ManageAccounts: which actions apply to an account, and list filtering.
import type { AccountAction, InstructorReviewDecision, User } from '@silveracademy/shared';
import type { AccountFilters } from '../types';

/** Actions whose reason the backend requires (functions.md: FLAG, SUSPEND). */
const REASON_ACTIONS: readonly AccountAction[] = ['FLAG', 'SUSPEND'];

export const isAdminAccount = (u: Pick<User, 'roles'>): boolean => u.roles.includes('ADMIN');
export const actionNeedsReason = (a: AccountAction): boolean => REASON_ACTIONS.includes(a);

export function availableActions(u: Pick<User, 'roles' | 'status' | 'flagged'>): AccountAction[] {
  if (isAdminAccount(u)) return [];
  if (u.status === 'SUSPENDED') return ['REACTIVATE'];
  if (u.status !== 'ACTIVE') return [];
  return [u.flagged ? 'UNFLAG' : 'FLAG', 'SUSPEND'];
}

export function filterAccounts(users: readonly User[], f: AccountFilters): User[] {
  return users.filter(
    (u) =>
      (!f.role || u.roles.includes(f.role)) &&
      (!f.status || u.status === f.status) &&
      (!f.flagged || u.flagged === (f.flagged === 'yes')),
  );
}

/** Decisions that need a reason from the admin (functions.md: REJECT, REQUEST_REVISION). */
export const decisionNeedsReason = (d: InstructorReviewDecision): boolean => d !== 'APPROVE';
