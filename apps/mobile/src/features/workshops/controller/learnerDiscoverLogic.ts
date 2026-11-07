// UC #2-1 SearchWorkshops: pure filter/sort/recommend pipeline over the OPEN workshops (ADR-018).
import {
  filterWorkshops,
  recommendWorkshops,
  sortByDistance,
  sortByStart,
  type LatLng,
  type Workshop,
  type WorkshopCategory,
  type WorkshopFilter,
  type WithDistance,
} from '@silveracademy/shared';

export type DiscoverSort = 'SOONEST' | 'NEAREST';

export interface DiscoverState {
  keyword: string;
  category: WorkshopCategory | null;
  /** Only workshops starting within this many days; null = any date. */
  days: number | null;
  /** 6-digit postal code used for "Nearest" instead of the device location; empty = device. */
  postal: string;
  sort: DiscoverSort;
}

export const INITIAL_DISCOVER_STATE: DiscoverState = {
  keyword: '',
  category: null,
  days: null,
  postal: '',
  sort: 'SOONEST',
};

export function buildFilter(state: DiscoverState, now: Date): WorkshopFilter {
  const f: WorkshopFilter = { keyword: state.keyword };
  if (state.category) f.categories = [state.category];
  if (state.days) f.to = new Date(now.getTime() + state.days * 86_400_000);
  return f;
}

export const isFiltered = (s: DiscoverState): boolean =>
  s.keyword.trim() !== '' || s.category !== null || s.days !== null;

export interface DiscoverResult {
  results: WithDistance<Workshop>[];
  recommended: Workshop[];
}

/** Drops workshops that already started, filters, sorts (distance only when a location is known). */
export function computeDiscover(
  items: readonly Workshop[],
  state: DiscoverState,
  origin: LatLng | null,
  now: Date,
): DiscoverResult {
  const upcoming = items.filter((w) => !w.startAt || w.startAt.toDate().getTime() > now.getTime());
  const filtered = filterWorkshops(upcoming, buildFilter(state, now));
  const results: WithDistance<Workshop>[] =
    state.sort === 'NEAREST' && origin
      ? sortByDistance(filtered, origin)
      : sortByStart(filtered).map((w) => ({ ...w, distanceKm: null }));
  const recommended = isFiltered(state)
    ? []
    : recommendWorkshops(upcoming, origin ? { origin } : {});
  return { results, recommended };
}

export const formatDistance = (km: number | null): string | null =>
  km === null ? null : km < 10 ? km.toFixed(1) : String(Math.round(km));

/** One map pin per venue (several workshops can share a venue); workshops without a venue are left out. */
export function venuePins<W extends Pick<Workshop, 'venue'>>(items: readonly W[]) {
  const byId = new Map<string, NonNullable<W['venue']> & { id: string; workshops: W[] }>();
  for (const w of items) {
    if (!w.venue) continue;
    const pin = byId.get(w.venue.facilityId);
    if (pin) pin.workshops.push(w);
    else byId.set(w.venue.facilityId, { ...w.venue, id: w.venue.facilityId, workshops: [w] });
  }
  return [...byId.values()];
}
