// UC #4-1 my facilities: load + save (add/edit) through the repo.
import { useCallback } from 'react';
import { useSession } from '../../auth';
import { fetchMyFacilities, saveFacility } from '../repo/venuesRepo';
import type { FacilityView } from '../types';
import { toFacilityView } from './mappers';
import type { FacilityInput } from './facilityForm';
import { useGuardedAction } from './useGuarded';
import { useLoad } from './useLoad';

const NONE: FacilityView[] = [];

export function useFacilities() {
  const { state } = useSession();
  const guard = useGuardedAction();
  const uid = state.status === 'signedIn' ? state.user.uid : null;
  const load = useCallback(
    uid
      ? async () =>
          (await fetchMyFacilities(uid))
            .map(toFacilityView)
            .sort((a, b) => a.name.localeCompare(b.name))
      : () => Promise.resolve(NONE),
    [uid],
  );
  const list = useLoad<FacilityView[]>(load, NONE);
  const { reload } = list;
  const save = useCallback(
    async (input: FacilityInput) => {
      const res = await guard(() => saveFacility(input));
      if (res.ok) reload();
      return res;
    },
    [guard, reload],
  );
  return { ...list, save };
}
