// UC #5-1 ManageAccounts: list/search state and account detail with actions.
import { useCallback, useMemo, useState } from 'react';
import type { AccountAction } from '@silveracademy/shared';
import { useSession } from '../../auth';
import { getInstructorProfile, getUser, searchUsers, setAccountStatus } from '../repo/usersRepo';
import { EMPTY_FILTERS } from '../types';
import type { AccountFilters, DecisionOutcome } from '../types';
import { actionNeedsReason, filterAccounts } from './accountRules';
import { submitWithReason } from './decision';
import { useLoad } from '../../../services/useLoad';

export function useAccountList() {
  const [nameQuery, setNameQuery] = useState('');
  const [submitted, setSubmitted] = useState('');
  const [filters, setFilters] = useState<AccountFilters>(EMPTY_FILTERS);
  const list = useLoad(() => searchUsers(submitted), [submitted]);
  const rows = useMemo(() => filterAccounts(list.data ?? [], filters), [list.data, filters]);
  return {
    nameQuery,
    setNameQuery,
    search: () => setSubmitted(nameQuery),
    filters,
    setFilters,
    rows,
    loading: list.loading,
    error: list.error,
    reload: list.reload,
  };
}

export function useAccountDetail(uid: string) {
  const { logout } = useSession();
  const user = useLoad(() => getUser(uid), [uid]);
  const profile = useLoad(() => getInstructorProfile(uid), [uid]);
  const [busy, setBusy] = useState(false);

  const act = useCallback(
    async (action: AccountAction, reasonText: string): Promise<DecisionOutcome<void>> => {
      const version = user.data?.version;
      if (version === undefined) return { kind: 'invalid', message: '' };
      setBusy(true);
      const outcome = await submitWithReason({
        reasonText,
        reasonRequired: actionNeedsReason(action),
        call: async (reason) => {
          await setAccountStatus(uid, action, version, reason);
        },
      });
      setBusy(false);
      if (outcome.kind === 'done' || (outcome.kind === 'failed' && outcome.refresh)) {
        user.reload();
      }
      if (outcome.kind === 'failed' && outcome.endSession) void logout();
      return outcome;
    },
    [uid, user, logout],
  );

  return {
    user: user.data,
    profile: profile.data,
    loading: user.loading,
    error: user.error,
    reload: user.reload,
    busy,
    act,
  };
}
