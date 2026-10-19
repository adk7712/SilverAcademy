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
  /** YYYY-MM-DD, Singapore time; empty = unset. */
  from: string;
  to: string;
  sort: DiscoverSort;
}

export const INITIAL_DISCOVER_STATE: DiscoverState = {
  keyword: '',
  category: null,
  from: '',
  to: '',
  sort: 'SOONEST',
};

const SG_OFFSET = '+08:00';
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Null when empty or not a real calendar date. `endOfDay` makes the To date inclusive. */
export function parseDateInput(text: string, endOfDay: boolean): Date | null {
  const t = text.trim();
  if (!DATE_RE.test(t)) return null;
  const [y, m, d] = t.split('-').map(Number) as [number, number, number];
  const check = new Date(Date.UTC(y, m - 1, d));
  // Rejects 2026-02-31 style dates that Date would roll over.
  if (check.getUTCMonth() !== m - 1 || check.getUTCDate() !== d) return null;
  return new Date(`${t}T${endOfDay ? '23:59:59' : '00:00:00'}${SG_OFFSET}`);
}

export interface DateErrors {
  from: boolean;
  to: boolean;
  order: boolean;
}

export function validateDates(state: Pick<DiscoverState, 'from' | 'to'>): DateErrors {
  const from = state.from.trim() !== '' && parseDateInput(state.from, false) === null;
  const to = state.to.trim() !== '' && parseDateInput(state.to, true) === null;
  const a = parseDateInput(state.from, false);
  const b = parseDateInput(state.to, true);
  return { from, to, order: a !== null && b !== null && a.getTime() > b.getTime() };
}

export function buildFilter(state: DiscoverState): WorkshopFilter {
  const f: WorkshopFilter = { keyword: state.keyword };
  if (state.category) f.categories = [state.category];
  const from = parseDateInput(state.from, false);
  const to = parseDateInput(state.to, true);
  if (from) f.from = from;
  if (to) f.to = to;
  return f;
}

export const isFiltered = (s: DiscoverState): boolean =>
  s.keyword.trim() !== '' || s.category !== null || s.from.trim() !== '' || s.to.trim() !== '';

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
  const filtered = filterWorkshops(upcoming, buildFilter(state));
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
