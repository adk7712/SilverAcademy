// UC #3-1 ViewWorkshops controller: location (optional), nearby/all toggle, list state.
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { LatLng } from '@silveracademy/shared';
import { errorMessage } from '../../../services/errors/errorMessage';
import { getDeviceLocation } from '../../../services/deviceLocation';
import { useSession } from '../../auth';
import { getMyAssignmentsSafe } from './assignedIds';
import { listOpenWorkshops } from '../repo/volunteerRepo';
import type { OpportunityWorkshop } from '../volunteerTypes';
import { buildOpportunityList } from './volunteerLogic';

export function useVolunteerOpportunities() {
  const { state } = useSession();
  const uid = state.status === 'signedIn' ? state.uid : null;
  const [workshops, setWorkshops] = useState<OpportunityWorkshop[]>([]);
  const [assignedIds, setAssignedIds] = useState<ReadonlySet<string>>(new Set());
  const [origin, setOrigin] = useState<LatLng | null>(null);
  const [locationDenied, setLocationDenied] = useState(false);
  const [viewAll, setViewAll] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [list, assigned] = await Promise.all([
        listOpenWorkshops(),
        uid ? getMyAssignmentsSafe(uid) : Promise.resolve(new Set<string>()),
      ]);
      setWorkshops(list);
      setAssignedIds(assigned);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [uid]);

  const locate = useCallback(async () => {
    const result = await getDeviceLocation();
    setOrigin(result.status === 'ok' ? result.origin : null);
    setLocationDenied(result.status !== 'ok');
  }, []);

  useEffect(() => {
    void load();
    void locate();
  }, [load, locate]);

  const list = useMemo(
    () => buildOpportunityList(workshops, { origin, viewAll, now: new Date() }),
    [workshops, origin, viewAll],
  );

  return {
    list,
    assignedIds,
    loading,
    error,
    locationDenied,
    viewAll,
    toggleViewAll: () => setViewAll((v) => !v),
    reload: load,
    retryLocation: locate,
  };
}
