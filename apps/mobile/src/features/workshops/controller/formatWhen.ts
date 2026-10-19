// UC #3-1 human date/time text for workshop start/end (device locale, Singapore time zone).
import { format, strings } from '../../../i18n';

const SG_TIME_ZONE = 'Asia/Singapore';

const dateTime = new Intl.DateTimeFormat('en-SG', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  hour: 'numeric',
  minute: '2-digit',
  timeZone: SG_TIME_ZONE,
});
const timeOnly = new Intl.DateTimeFormat('en-SG', {
  hour: 'numeric',
  minute: '2-digit',
  timeZone: SG_TIME_ZONE,
});

export function formatWhen(start: Date | null, end: Date | null): string {
  if (!start) return '';
  return end
    ? format(strings.common.timeRangeTo, {
        start: dateTime.format(start),
        end: timeOnly.format(end),
      })
    : dateTime.format(start);
}
