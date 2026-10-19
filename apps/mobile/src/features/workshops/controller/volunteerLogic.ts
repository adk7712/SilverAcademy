// UC #3-1 #3-2 pure rules for the Volunteer opportunity list and detail actions.
import { haversineKm, type LatLng } from '@silveracademy/shared';
import type { AssignmentView, DetailAction, OpportunityWorkshop } from '../volunteerTypes';

/** "Nearby" cut-off for the proximity view (Singapore is ~50 km wide). */
export const NEARBY_RADIUS_KM = 10;
export const DISTANCE_DECIMALS = 1;

export interface OpportunityItem {
  workshop: OpportunityWorkshop;
  distanceKm: number | null;
}

export type ListMode = 'NEARBY' | 'ALL' | 'UNORDERED';

export interface OpportunityList {
  items: OpportunityItem[];
  mode: ListMode;
  /** True when the user asked for the nearby view but nothing is close (show "no nearby opportunities"). */
  noNearby: boolean;
}

const startMs = (w: OpportunityWorkshop) => (w.startAt ? w.startAt.getTime() : Infinity);

/** A workshop a volunteer can still sign up for: open, needs volunteers, places left, not started. */
export function isOpenOpportunity(w: OpportunityWorkshop, now: Date): boolean {
  return (
    w.status === 'OPEN' &&
    w.needsVolunteers &&
    w.volunteersAssigned < w.volunteerSlots &&
    (w.startAt === null || w.startAt.getTime() > now.getTime())
  );
}

/**
 * Nearest first when `origin` is known (default NEARBY filter, `viewAll` shows every opportunity);
 * without `origin` (location denied) the list is unordered by distance: soonest first.
 */
export function buildOpportunityList(
  workshops: readonly OpportunityWorkshop[],
  opts: { origin: LatLng | null; viewAll: boolean; now: Date },
): OpportunityList {
  const open = workshops.filter((w) => isOpenOpportunity(w, opts.now));
  if (!opts.origin) {
    const items = [...open]
      .sort((a, b) => startMs(a) - startMs(b) || a.id.localeCompare(b.id))
      .map((workshop) => ({ workshop, distanceKm: null }));
    return { items, mode: 'UNORDERED', noNearby: false };
  }
  const origin = opts.origin;
  const withDistance: OpportunityItem[] = open
    .map((workshop) => ({
      workshop,
      distanceKm: workshop.venue ? haversineKm(origin, workshop.venue) : null,
    }))
    .sort((a, b) => {
      if (a.distanceKm === null || b.distanceKm === null) {
        return a.distanceKm === b.distanceKm
          ? startMs(a.workshop) - startMs(b.workshop)
          : a.distanceKm === null
            ? 1
            : -1;
      }
      return a.distanceKm - b.distanceKm || startMs(a.workshop) - startMs(b.workshop);
    });
  if (opts.viewAll) return { items: withDistance, mode: 'ALL', noNearby: false };
  const nearby = withDistance.filter(
    (i) => i.distanceKm !== null && i.distanceKm <= NEARBY_RADIUS_KM,
  );
  return {
    items: nearby,
    mode: 'NEARBY',
    noNearby: nearby.length === 0 && withDistance.length > 0,
  };
}

export const formatDistanceKm = (km: number): string => km.toFixed(DISTANCE_DECIMALS);

/** Which action the detail screen offers (server re-checks everything: NOT_ACCEPTING, FULL, STARTED). */
export function detailAction(
  w: OpportunityWorkshop,
  assignment: AssignmentView | null,
  now: Date,
): DetailAction {
  const started = w.startAt !== null && w.startAt.getTime() <= now.getTime();
  if (assignment?.status === 'ASSIGNED') return started ? 'STARTED' : 'WITHDRAW';
  if (started) return 'STARTED';
  if (!w.needsVolunteers || w.status !== 'OPEN') return 'NOT_ACCEPTING';
  if (w.volunteersAssigned >= w.volunteerSlots) return 'FULL';
  return 'ASSIST';
}

export const volunteerPlacesLeft = (w: OpportunityWorkshop) =>
  Math.max(0, w.volunteerSlots - w.volunteersAssigned);

/** Time bucket for the Assigned list. */
export type AssignedPhase = 'UPCOMING' | 'COMPLETED' | 'CANCELLED';
export function assignedPhase(w: OpportunityWorkshop, now: Date): AssignedPhase {
  if (w.status === 'CANCELLED') return 'CANCELLED';
  if (w.status === 'COMPLETED' || (w.endAt !== null && w.endAt.getTime() < now.getTime())) {
    return 'COMPLETED';
  }
  return 'UPCOMING';
}

/** Upcoming first (soonest), then past (most recent first). */
export function sortAssigned(workshops: readonly OpportunityWorkshop[], now: Date) {
  const upcoming = workshops
    .filter((w) => assignedPhase(w, now) === 'UPCOMING')
    .sort((a, b) => startMs(a) - startMs(b));
  const past = workshops
    .filter((w) => assignedPhase(w, now) !== 'UPCOMING')
    .sort((a, b) => startMs(b) - startMs(a));
  return [...upcoming, ...past];
}
