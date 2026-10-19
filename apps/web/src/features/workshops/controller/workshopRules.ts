// UC #5-2 ManageWorkshops: allowed status actions, impact warning, edit lock, filtering.
import type { Workshop, WorkshopAdminAction } from '@silveracademy/shared';
import type { WorkshopFilters } from '../types';

type Dated = Pick<Workshop, 'status' | 'seatsTaken' | 'startAt'>;

/** Mirrors the transition table in docs/api/functions.md (workshops-adminSetStatus). */
export function availableStatusActions(w: Pick<Workshop, 'status'>): WorkshopAdminAction[] {
  switch (w.status) {
    case 'OPEN':
      return ['COMPLETED', 'CANCELLED', 'ARCHIVED'];
    case 'DRAFT':
    case 'PENDING_VENUE':
      return ['CANCELLED', 'ARCHIVED'];
    case 'COMPLETED':
    case 'CANCELLED':
      return ['ARCHIVED'];
    case 'ARCHIVED':
      return ['UNARCHIVE'];
  }
}

export const isUpcoming = (w: Pick<Workshop, 'startAt'>, now: Date): boolean =>
  !!w.startAt && w.startAt.toDate().getTime() > now.getTime();

/** Seats that will be affected when the admin confirms; 0 means no warning is needed (arch 4.7). */
export function impactedBookings(w: Dated, action: WorkshopAdminAction, now: Date): number {
  if (w.seatsTaken <= 0) return 0;
  if (action === 'CANCELLED') return w.seatsTaken;
  if (action === 'ARCHIVED' && w.status === 'OPEN' && isUpcoming(w, now)) return w.seatsTaken;
  return 0;
}

export const statusActionNeedsReason = (a: WorkshopAdminAction): boolean => a === 'CANCELLED';

/** Capacity is locked once started or finished (functions.md WORKSHOP_LOCKED_FIELDS). */
export function capacityLocked(w: Dated, now: Date): boolean {
  if (w.status === 'COMPLETED' || w.status === 'CANCELLED') return true;
  return !!w.startAt && w.startAt.toDate().getTime() <= now.getTime();
}

export function filterWorkshops(rows: readonly Workshop[], f: WorkshopFilters): Workshop[] {
  const q = f.query.trim().toLowerCase();
  return rows.filter(
    (w) =>
      (!q || w.title.toLowerCase().includes(q) || w.instructorName.toLowerCase().includes(q)) &&
      (!f.status || w.status === f.status) &&
      (!f.category || w.category === f.category),
  );
}
