// UC #1-4 #3-4 loads the workshops the signed-in instructor/volunteer may scan for.
import { useCallback, useEffect, useState } from 'react';
import { useSession } from '../../auth';
import { errorMessage } from '../../../services/errors/errorMessage';
import { listScannableWorkshops } from '../repo/attendanceRepo';
import type { ScanWorkshop } from '../types';
import { sortScanWorkshops } from './workshopOptions';

export function useScannableWorkshops() {
  const { state } = useSession();
  const uid = state.status === 'signedIn' ? state.uid : null;
  const roles = state.status === 'signedIn' ? state.roles : null;
  const [workshops, setWorkshops] = useState<ScanWorkshop[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!uid || !roles) return;
    setError(null);
    setWorkshops(null);
    try {
      setWorkshops(sortScanWorkshops(await listScannableWorkshops(uid, roles), Date.now()));
    } catch (e) {
      setError(errorMessage(e));
    }
  }, [uid, roles]);

  useEffect(() => {
    void load();
  }, [load]);

  return { workshops, error, reload: load };
}
