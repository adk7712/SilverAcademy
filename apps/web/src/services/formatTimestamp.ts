// Shared date display helper for Firestore timestamps (Singapore time).
import type { TimestampLike } from '@silveracademy/shared';

const DISPLAY_LOCALE = 'en-SG';
const DISPLAY_TIME_ZONE = 'Asia/Singapore';

export function formatTimestamp(ts: Pick<TimestampLike, 'toDate'> | null | undefined): string {
  if (!ts) return '-';
  const d = ts.toDate();
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleString(DISPLAY_LOCALE, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: DISPLAY_TIME_ZONE,
  });
}
