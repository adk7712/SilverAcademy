// UC #3-3 ViewAssigned controller: assignments -> workshops, lazy class list per workshop (bookings-getRoster).
import { useCallback, useEffect, useState } from 'react';
import type { CallableOutput } from '@silveracademy/shared';
import { errorMessage } from '../../../services/errors/errorMessage';
import { useSession } from '../../auth';
import { getRoster, getWorkshop, listMyAssignments } from '../repo/volunteerRepo';
import type { OpportunityWorkshop } from '../volunteerTypes';
import { sortAssigned } from './volunteerLogic';

export type RosterState =
  | { status: 'loading' }
  | { status: 'ready'; roster: CallableOutput<'bookings-getRoster'> }
  | { status: 'error'; message: string };

export function useAssignedWorkshops() {
  const { state } = useSession();
  const uid = state.status === 'signedIn' ? state.uid : null;
  const [workshops, setWorkshops] = useState<OpportunityWorkshop[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [rosters, setRosters] = useState<Record<string, RosterState>>({});

  const load = useCallback(async () => {
    if (!uid) return;
    setLoading(true);
    setError(null);
    try {
      const assigned = (await listMyAssignments(uid)).filter((a) => a.status === 'ASSIGNED');
      const found = await Promise.all(assigned.map((a) => getWorkshop(a.workshopId)));
      setWorkshops(
        sortAssigned(
          found.filter((w): w is OpportunityWorkshop => w !== null),
          new Date(),
        ),
      );
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [uid]);

  useEffect(() => {
    void load();
  }, [load]);

  const loadRoster = useCallback(async (workshopId: string) => {
    setRosters((r) => ({ ...r, [workshopId]: { status: 'loading' } }));
    try {
      const roster = await getRoster(workshopId);
      setRosters((r) => ({ ...r, [workshopId]: { status: 'ready', roster } }));
    } catch (e) {
      setRosters((r) => ({ ...r, [workshopId]: { status: 'error', message: errorMessage(e) } }));
    }
  }, []);

  const toggle = (workshopId: string) => {
    if (openId === workshopId) {
      setOpenId(null);
      return;
    }
    setOpenId(workshopId);
    void loadRoster(workshopId);
  };

  return { workshops, loading, error, openId, rosters, toggle, reload: load, loadRoster };
}
