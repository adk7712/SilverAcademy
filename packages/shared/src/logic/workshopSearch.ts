// UC #2-1 #3-1 #3-2 workshop filter/sort/recommend (client-side, architecture.md 2.6).
import { RECO_DEFAULT_LIMIT, RECO_W_POPULARITY, RECO_W_PROXIMITY } from '../constants';
import type { WorkshopCategory } from '../enums';
import type { TimestampLike } from '../entities/common';
import type { VenueSnapshot, Workshop } from '../entities/workshop';
import { haversineKm, type LatLng } from './geo';

/** The subset of Workshop the pure functions need (works on view models too). */
export type SearchableWorkshop = Pick<
  Workshop,
  | 'id'
  | 'title'
  | 'description'
  | 'category'
  | 'capacity'
  | 'seatsTaken'
  | 'instructorName'
  | 'needsVolunteers'
  | 'volunteerSlots'
  | 'volunteersAssigned'
> & {
  startAt: TimestampLike | null;
  venue: Pick<VenueSnapshot, 'lat' | 'lng' | 'name' | 'address'> | null;
};

export interface WorkshopFilter {
  keyword?: string;
  categories?: WorkshopCategory[];
  from?: Date;
  to?: Date;
  hasSeatsOnly?: boolean;
  volunteerOpportunitiesOnly?: boolean;
}

const startMs = (w: SearchableWorkshop) => (w.startAt ? w.startAt.toDate().getTime() : Infinity);

export const seatsRemaining = (w: Pick<Workshop, 'capacity' | 'seatsTaken'>) =>
  Math.max(0, w.capacity - w.seatsTaken);

export const isVolunteerOpportunity = (
  w: Pick<Workshop, 'needsVolunteers' | 'volunteerSlots' | 'volunteersAssigned'>,
) => w.needsVolunteers && w.volunteersAssigned < w.volunteerSlots;

/** Case-insensitive keyword over title, description, instructor, venue; all terms must match. */
export function filterWorkshops<T extends SearchableWorkshop>(
  items: readonly T[],
  f: WorkshopFilter,
): T[] {
  const terms = (f.keyword ?? '').toLowerCase().split(/\s+/).filter(Boolean);
  return items.filter((w) => {
    if (f.categories?.length && !f.categories.includes(w.category)) return false;
    if (f.hasSeatsOnly && seatsRemaining(w) === 0) return false;
    if (f.volunteerOpportunitiesOnly && !isVolunteerOpportunity(w)) return false;
    const t = startMs(w);
    if (f.from && t < f.from.getTime()) return false;
    if (f.to && t > f.to.getTime()) return false;
    if (terms.length === 0) return true;
    const hay = [w.title, w.description, w.instructorName, w.venue?.name, w.venue?.address]
      .join(' ')
      .toLowerCase();
    return terms.every((term) => hay.includes(term));
  });
}

export const sortByStart = <T extends SearchableWorkshop>(items: readonly T[]): T[] =>
  [...items].sort((a, b) => startMs(a) - startMs(b) || a.id.localeCompare(b.id));

export type WithDistance<T> = T & { distanceKm: number | null };

/** Nearest first; workshops without a venue go last. Stable (ties by start time). */
export function sortByDistance<T extends SearchableWorkshop>(
  items: readonly T[],
  origin: LatLng,
): WithDistance<T>[] {
  const withDist = items.map((w) => ({
    ...w,
    distanceKm: w.venue ? haversineKm(origin, w.venue) : null,
  }));
  return withDist.sort((a, b) => {
    if (a.distanceKm === null && b.distanceKm === null) return startMs(a) - startMs(b);
    if (a.distanceKm === null) return 1;
    if (b.distanceKm === null) return -1;
    return a.distanceKm - b.distanceKm || startMs(a) - startMs(b);
  });
}

/** score = W_POP * seatsTaken/capacity + W_PROX * 1/(1+km); proximity 0 without location. */
export function recommendationScore(w: SearchableWorkshop, origin?: LatLng): number {
  const popularity = w.capacity > 0 ? w.seatsTaken / w.capacity : 0;
  const proximity = origin && w.venue ? 1 / (1 + haversineKm(origin, w.venue)) : 0;
  return RECO_W_POPULARITY * popularity + RECO_W_PROXIMITY * proximity;
}

/** Top-N workshops with seats left, by score desc (ties by start time then id). */
export function recommendWorkshops<T extends SearchableWorkshop>(
  items: readonly T[],
  opts: { origin?: LatLng; limit?: number } = {},
): T[] {
  const { origin, limit = RECO_DEFAULT_LIMIT } = opts;
  return items
    .filter((w) => seatsRemaining(w) > 0)
    .map((w) => ({ w, score: recommendationScore(w, origin) }))
    .sort(
      (a, b) => b.score - a.score || startMs(a.w) - startMs(b.w) || a.w.id.localeCompare(b.w.id),
    )
    .slice(0, limit)
    .map((x) => x.w);
}
