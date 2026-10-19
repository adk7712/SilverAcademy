// UC #4-2 partner's venue requests: load, split into queues, decide.
import { useCallback, useMemo } from 'react';
import { useSession } from '../../auth';
import { decideRequest, fetchMyRequests } from '../repo/venuesRepo';
import type { RequestView } from '../types';
import { submitDecision } from './decisions';
import type { DecisionForm } from './decisions';
import { splitQueues } from './requestRules';
import { toRequestView } from './mappers';
import { isSessionError } from '../../../services/errors';
import { useLoad } from './useLoad';

const NONE: RequestView[] = [];

export function useVenueRequests() {
  const { state, logout } = useSession();
  const uid = state.status === 'signedIn' ? state.user.uid : null;
  const load = useCallback(
    uid ? async () => (await fetchMyRequests(uid)).map(toRequestView) : () => Promise.resolve(NONE),
    [uid],
  );
  const list = useLoad<RequestView[]>(load, NONE);
  const queues = useMemo(() => splitQueues(list.data), [list.data]);

  const decide = useCallback(
    async (form: DecisionForm) => {
      const outcome = await submitDecision(decideRequest, form);
      if (outcome.kind === 'error' && isSessionError(outcome.error)) void logout();
      // Reload after any decision, including conflicts, so the state shown is the committed one.
      list.reload();
      return outcome;
    },
    [logout, list],
  );
  return { ...list, queues, decide };
}
