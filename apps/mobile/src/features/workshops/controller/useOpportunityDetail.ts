// UC #3-2 AssistWorkshop controller: load workshop + own assignment, opt in (confirm step), withdraw.
import { useCallback, useEffect, useState } from 'react';
import { isAppError } from '@silveracademy/shared';
import { useToast } from '../../../design';
import { format, strings } from '../../../i18n';
import { errorMessage } from '../../../services/errors/errorMessage';
import { toAppError } from '../../../services/errors/toAppError';
import { useSession } from '../../auth';
import { getMyAssignment, getWorkshop, optIn, withdraw } from '../repo/volunteerRepo';
import type { AssignmentView, OpportunityWorkshop } from '../volunteerTypes';
import { detailAction } from './volunteerLogic';

type Confirming = 'ASSIST' | 'WITHDRAW' | null;

export function useOpportunityDetail(workshopId: string) {
  const { state } = useSession();
  const uid = state.status === 'signedIn' ? state.uid : null;
  const toast = useToast();
  const [workshop, setWorkshop] = useState<OpportunityWorkshop | null>(null);
  const [assignment, setAssignment] = useState<AssignmentView | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<Confirming>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [w, a] = await Promise.all([
        getWorkshop(workshopId),
        uid ? getMyAssignment(workshopId, uid) : Promise.resolve(null),
      ]);
      setWorkshop(w);
      setAssignment(a);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [workshopId, uid]);

  useEffect(() => {
    void load();
  }, [load]);

  const run = async (kind: 'ASSIST' | 'WITHDRAW') => {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      if (kind === 'ASSIST') await optIn(workshopId);
      else await withdraw(workshopId);
      toast.show(
        kind === 'ASSIST'
          ? strings.workshopsVolunteer.assistedToast
          : strings.workshopsVolunteer.withdrawnToast,
        'success',
      );
    } catch (e) {
      const appError = toAppError(e);
      if (isAppError(appError) && appError.code === 'ALREADY_OPTED_IN') {
        const status = String(appError.details?.status ?? 'ASSIGNED') as 'ASSIGNED' | 'WITHDRAWN';
        setNotice(
          format(strings.workshopsVolunteer.alreadyOptedIn, {
            status: strings.workshopsVolunteer.status[status] ?? status,
          }),
        );
      } else {
        setError(errorMessage(appError));
      }
    } finally {
      setConfirming(null);
      setBusy(false);
      await load(); // counters/status may have changed (VOLUNTEERS_FULL, already opted in)
    }
  };

  const action = workshop ? detailAction(workshop, assignment, new Date()) : null;
  return {
    workshop,
    assignment,
    action,
    loading,
    busy,
    error,
    notice,
    confirming,
    askAssist: () => setConfirming('ASSIST'),
    askWithdraw: () => setConfirming('WITHDRAW'),
    cancelConfirm: () => setConfirming(null),
    confirm: () => (confirming ? run(confirming) : Promise.resolve()),
    reload: load,
  };
}
