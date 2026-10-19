// UC #2-1 SearchWorkshops: screen controller (load, filters, device location with graceful fallback).
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { LatLng, Workshop } from '@silveracademy/shared';
import { errorMessage } from '../../../services/errors/errorMessage';
import { fetchOpenWorkshops } from '../repo/learnerWorkshopRepo';
import { getDeviceLocation } from '../repo/learnerLocationRepo';
import {
  INITIAL_DISCOVER_STATE,
  computeDiscover,
  isFiltered,
  validateDates,
  type DiscoverSort,
  type DiscoverState,
} from './learnerDiscoverLogic';

export type LocationNotice = 'none' | 'locating' | 'denied' | 'unavailable';

export function useLearnerDiscover() {
  const [items, setItems] = useState<Workshop[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<DiscoverState>(INITIAL_DISCOVER_STATE);
  const [origin, setOrigin] = useState<LatLng | null>(null);
  const [locationNotice, setLocationNotice] = useState<LocationNotice>('none');
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let live = true;
    setLoading(true);
    fetchOpenWorkshops()
      .then((w) => {
        if (!live) return;
        setItems(w);
        setError(null);
      })
      .catch((e) => live && setError(errorMessage(e)))
      .finally(() => live && setLoading(false));
    return () => {
      live = false;
    };
  }, [tick]);

  const update = useCallback((patch: Partial<DiscoverState>) => {
    setFilters((f) => ({ ...f, ...patch }));
  }, []);

  const setSort = useCallback(
    async (sort: DiscoverSort) => {
      if (sort === 'SOONEST') {
        update({ sort });
        setLocationNotice('none');
        return;
      }
      setLocationNotice('locating');
      const loc = await getDeviceLocation();
      if (loc.status === 'ok') {
        setOrigin(loc.origin);
        update({ sort: 'NEAREST' });
        setLocationNotice('none');
      } else {
        // Graceful fallback: keep sorting by date and explain why.
        update({ sort: 'SOONEST' });
        setLocationNotice(loc.status);
      }
    },
    [update],
  );

  const reset = useCallback(() => {
    setFilters((f) => ({ ...INITIAL_DISCOVER_STATE, sort: f.sort }));
  }, []);

  const dateErrors = validateDates(filters);
  const computed = useMemo(
    () => computeDiscover(items, filters, origin, new Date()),
    [items, filters, origin],
  );

  return {
    filters,
    update,
    setSort,
    reset,
    dateErrors,
    filtered: isFiltered(filters),
    loading,
    error,
    locationNotice,
    reload: () => setTick((t) => t + 1),
    totalOpen: items.length,
    ...computed,
  };
}
