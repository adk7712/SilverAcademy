// Local view models for users (UC #5-1 #5-5); entity types come from @silveracademy/shared.
import type { AccountStatus, Role } from '@silveracademy/shared';

export interface AccountFilters {
  role: Role | '';
  status: AccountStatus | '';
  flagged: '' | 'yes' | 'no';
}

export const EMPTY_FILTERS: AccountFilters = { role: '', status: '', flagged: '' };

/** Result of a decision submit, consumed by the ui. */
export type DecisionOutcome<T> =
  | { kind: 'done'; value: T }
  | { kind: 'invalid'; message: string }
  | { kind: 'failed'; message: string; refresh: boolean; endSession: boolean };
