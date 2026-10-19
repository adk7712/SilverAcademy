// UC #1-4 #3-4 check-in window (architecture.md 4.3) and feedback window (#2-4).
import {
  CHECKIN_CLOSES_MIN_AFTER,
  CHECKIN_OPENS_MIN_BEFORE,
  FEEDBACK_WINDOW_DAYS,
  MS_PER_DAY,
  MS_PER_MINUTE,
} from '../constants';

type DateInput = Date | number;
const ms = (d: DateInput) => (typeof d === 'number' ? d : d.getTime());

/** Open from startAt - CHECKIN_OPENS_MIN_BEFORE to endAt + CHECKIN_CLOSES_MIN_AFTER (inclusive). */
export function isCheckInWindowOpen(startAt: DateInput, endAt: DateInput, now: DateInput): boolean {
  const open = ms(startAt) - CHECKIN_OPENS_MIN_BEFORE * MS_PER_MINUTE;
  const close = ms(endAt) + CHECKIN_CLOSES_MIN_AFTER * MS_PER_MINUTE;
  return ms(now) >= open && ms(now) <= close;
}

/** Feedback allowed until endAt + FEEDBACK_WINDOW_DAYS. */
export function isFeedbackWindowOpen(endAt: DateInput, now: DateInput): boolean {
  return ms(now) <= ms(endAt) + FEEDBACK_WINDOW_DAYS * MS_PER_DAY;
}
