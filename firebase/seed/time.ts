// Seed time helpers (task 0.5). Fixture dates are relative to the run time on the Singapore calendar (UTC+8).
import { Timestamp } from 'firebase-admin/firestore';
import { MS_PER_DAY, MS_PER_MINUTE, SG_UTC_OFFSET_HOURS } from '@silveracademy/shared';

export const MS_PER_HOUR = 60 * MS_PER_MINUTE;
const SG_OFFSET_MS = SG_UTC_OFFSET_HOURS * MS_PER_HOUR;

/** Instant at `hour:minute` Singapore time, `dayOffset` days from today (negative = past). */
export function sgDateTime(now: Date, dayOffset: number, hour: number, minute = 0): Date {
  const sgDayStartUtc =
    Math.floor((now.getTime() + SG_OFFSET_MS) / MS_PER_DAY) * MS_PER_DAY - SG_OFFSET_MS;
  return new Date(
    sgDayStartUtc + dayOffset * MS_PER_DAY + hour * MS_PER_HOUR + minute * MS_PER_MINUTE,
  );
}

export const shiftDays = (date: Date, days: number): Date =>
  new Date(date.getTime() + days * MS_PER_DAY);

export const shiftMinutes = (date: Date, minutes: number): Date =>
  new Date(date.getTime() + minutes * MS_PER_MINUTE);

export const toTs = (date: Date): Timestamp => Timestamp.fromDate(date);
