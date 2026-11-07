// attendance-setCheckInCode / attendance-checkIn: the instructor sets a session code and a learner types it to
// check in (ADR-030). Replaces the staff-typed ticket code. Codes live in checkInCodes/{workshopId} (no client read).
import { AppError } from '@silveracademy/shared';
import {
  COL,
  defineCallable,
  ignoreCheckInWindow,
  refs,
  type CallableContext,
  type CallableResultOf,
  type CallerOptions,
} from '../../common';
import { recordAttendanceTx } from '../repo/attendanceRepo';

type Ctx<N extends 'attendance-setCheckInCode' | 'attendance-checkIn'> = Pick<
  CallableContext<N, CallerOptions>,
  'input' | 'caller' | 'db' | 'now'
>;

/** Only the workshop's instructor may set the code; setting it again replaces it. */
export async function setCheckInCode({
  input,
  caller,
  db,
}: Ctx<'attendance-setCheckInCode'>): Promise<{ ok: true }> {
  const workshop = (await refs.workshops(db).doc(input.workshopId).get()).data();
  if (workshop?.instructorId !== caller.uid) throw new AppError('NOT_AUTHORISED_FOR_WORKSHOP');
  await refs
    .raw(db, COL.checkInCodes)
    .doc(input.workshopId)
    .set({ code: input.code, instructorId: caller.uid });
  return { ok: true };
}

/** Own booking + matching code, then the normal attendance transaction (window, once-only, points). */
export async function checkIn(
  { input, caller, db, now }: Ctx<'attendance-checkIn'>,
  opts: { ignoreCheckInWindow?: boolean } = {},
): Promise<CallableResultOf<'attendance-checkIn'>> {
  const booking = (await refs.bookings(db).doc(input.bookingId).get()).data();
  if (booking?.learnerId !== caller.uid) throw new AppError('NO_BOOKING');
  const set = (await refs.raw(db, COL.checkInCodes).doc(booking.workshopId).get()).data();
  if (set?.code !== input.code) throw new AppError('CHECKIN_CODE_INVALID');
  return recordAttendanceTx(db, {
    workshopId: booking.workshopId,
    bookingId: input.bookingId,
    method: 'MANUAL',
    scanner: { uid: String(set.instructorId), roles: ['SENIOR_INSTRUCTOR'] },
    learnerId: caller.uid,
    ignoreCheckInWindow: opts.ignoreCheckInWindow ?? ignoreCheckInWindow(),
    now,
  });
}

export const setCheckInCodeCallable = defineCallable(
  'attendance-setCheckInCode',
  { roles: ['SENIOR_INSTRUCTOR'] },
  setCheckInCode,
);
export const checkInCallable = defineCallable('attendance-checkIn', { roles: ['LEARNER'] }, (ctx) =>
  checkIn(ctx),
);
