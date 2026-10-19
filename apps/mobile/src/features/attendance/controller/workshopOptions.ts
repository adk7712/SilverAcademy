// UC #1-4 #3-4 pure helpers for the workshop picker: ordering and check-in window hint (server decides).
import { isCheckInWindowOpen } from '@silveracademy/shared';
import type { ScanWorkshop } from '../types';

export type WindowHint = 'OPEN' | 'NOT_OPEN' | 'UNKNOWN';

/** Hint only: the server applies the real window (and a demo override). Volunteer rows lack endAt. */
export function windowHint(w: ScanWorkshop, now: number): WindowHint {
  if (w.startAtMs === null || w.endAtMs === null) return 'UNKNOWN';
  return isCheckInWindowOpen(w.startAtMs, w.endAtMs, now) ? 'OPEN' : 'NOT_OPEN';
}

/** Open-window first, then by start time; duplicates (owned + assigned) collapse to one. */
export function sortScanWorkshops(list: ScanWorkshop[], now: number): ScanWorkshop[] {
  const unique = [...new Map(list.map((w) => [w.id, w])).values()];
  const rank = (w: ScanWorkshop) => (windowHint(w, now) === 'OPEN' ? 0 : 1);
  return unique.sort(
    (a, b) => rank(a) - rank(b) || (a.startAtMs ?? Infinity) - (b.startAtMs ?? Infinity),
  );
}

export const formatDateTime = (isoOrMs: string | number | null): string =>
  isoOrMs === null ? '' : new Date(isoOrMs).toLocaleString();
