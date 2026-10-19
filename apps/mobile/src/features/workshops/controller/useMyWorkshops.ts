// UC #1-2 dashboard data: own workshops, reloaded whenever the screen regains focus.
import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import type { Workshop } from '@silveracademy/shared';
import { errorMessage } from '../../../services/errors/errorMessage';
import { useSession } from '../../auth';
import { fetchMyWorkshops } from '../repo/instructorWorkshopRepo';

export function useMyWorkshops() {
  const { state } = useSession();
  const uid = state.status === 'signedIn' ? state.uid : null;
  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!uid) return;
    setLoading(true);
    setError(null);
    try {
      setWorkshops(await fetchMyWorkshops(uid));
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [uid]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  return { workshops, loading, error, reload: load };
}
