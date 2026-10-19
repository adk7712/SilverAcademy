// UC #0-1 age check from date of birth in Singapore time (no DOB is stored).
import { MS_PER_HOUR, SENIOR_MIN_AGE, SG_UTC_OFFSET_HOURS } from '../constants';

/** Full years between `dateOfBirth` (YYYY-MM-DD) and `now`, both on the SG calendar. Null if malformed. */
export function ageInYears(dateOfBirth: string, now: Date): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateOfBirth);
  if (!m) return null;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const check = new Date(Date.UTC(y, mo - 1, d));
  check.setUTCFullYear(y); // Date.UTC maps years 0-99 to 1900-1999
  if (
    y < 1 ||
    check.getUTCFullYear() !== y ||
    check.getUTCMonth() !== mo - 1 ||
    check.getUTCDate() !== d
  )
    return null;
  const today = new Date(now.getTime() + SG_UTC_OFFSET_HOURS * MS_PER_HOUR);
  let age = today.getUTCFullYear() - y;
  const beforeBirthday =
    today.getUTCMonth() + 1 < mo || (today.getUTCMonth() + 1 === mo && today.getUTCDate() < d);
  if (beforeBirthday) age -= 1;
  return age >= 0 ? age : null;
}

export function isSeniorEligible(dateOfBirth: string, now: Date): boolean {
  const age = ageInYears(dateOfBirth, now);
  return age !== null && age >= SENIOR_MIN_AGE;
}
