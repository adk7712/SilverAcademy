// Pure Singapore-time date formatting for workshop times and ticket timestamps (UC #2-1, #2-3).
import { format, strings } from '../i18n';

const LOCALE = 'en-SG';
const TIME_ZONE = 'Asia/Singapore';

export const formatDate = (d: Date) =>
  d.toLocaleDateString(LOCALE, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: TIME_ZONE,
  });

export const formatTime = (d: Date) =>
  d.toLocaleTimeString(LOCALE, { hour: 'numeric', minute: '2-digit', timeZone: TIME_ZONE });

export const formatDateTime = (d: Date) =>
  format(strings.common.dateTimeComma, { date: formatDate(d), time: formatTime(d) });

/** "Sat, 1 Nov 2026, 10:00 am - 12:00 pm" */
export const formatRange = (start: Date, end: Date) =>
  format(strings.common.dateTimeComma, {
    date: formatDate(start),
    time: format(strings.common.timeRangeDash, {
      start: formatTime(start),
      end: formatTime(end),
    }),
  });
