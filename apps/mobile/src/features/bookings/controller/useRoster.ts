// UC #3-3 loads the class roster for a workshop; supports refresh.
import { useCallback, useEffect, useState } from 'react';
import { errorMessage } from '../../../services/errors/errorMessage';
import { fetchRoster } from '../repo/rosterRepo';
import type { Roster } from '../rosterTypes';

export function useRoster(workshopId: string) {
  const [roster, setRoster] = useState<Roster | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setRefreshing(true);
    setError(null);
    try {
      setRoster(await fetchRoster(workshopId));
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setRefreshing(false);
    }
  }, [workshopId]);

  useEffect(() => {
    void load();
  }, [load]);

  return { roster, error, refreshing, refresh: load };
}
