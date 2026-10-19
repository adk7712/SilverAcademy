// UC #1-4, #3-4 ScanAttendance: attendance-recordAttendance (QR or manual ticket code), architecture.md 4.3.
import { ATTENDANCE_STAFF_ROLES } from '@silveracademy/shared';
import {
  defineCallable,
  ignoreCheckInWindow,
  verifyQr,
  type CallableContext,
  type CallableResultOf,
  type CallerOptions,
} from '../../common';
import { methodOf } from '../controller/decideAttendance';
import { findBookingIdByTicket, recordAttendanceTx } from '../repo/attendanceRepo';

const ACCESS: CallerOptions = { roles: ATTENDANCE_STAFF_ROLES };

type Ctx = Pick<
  CallableContext<'attendance-recordAttendance', CallerOptions>,
  'input' | 'caller' | 'db' | 'now'
>;

export interface RecordAttendanceOptions {
  /** Defaults to env DEMO_IGNORE_CHECKIN_WINDOW. */
  ignoreCheckInWindow?: boolean;
}

/**
 * Pre-tx: QR -> verifyQr (INVALID_QR) or ticket code -> query (TICKET_NOT_FOUND). Then one transaction.
 * Exported so tests can call it directly against the emulator.
 */
export async function recordAttendance(
  ctx: Ctx,
  opts: RecordAttendanceOptions = {},
): Promise<CallableResultOf<'attendance-recordAttendance'>> {
  const { input, caller, db, now } = ctx;
  const method = methodOf(input);
  const bookingId =
    'qrPayload' in input
      ? verifyQr(input.qrPayload)
      : await findBookingIdByTicket(db, input.workshopId, input.ticketCode);
  const decision = await recordAttendanceTx(db, {
    workshopId: input.workshopId,
    bookingId,
    method,
    scanner: { uid: caller.uid, roles: caller.roles },
    ignoreCheckInWindow: opts.ignoreCheckInWindow ?? ignoreCheckInWindow(),
    now,
  });
  return {
    bookingId,
    learnerName: decision.learnerName,
    workshopTitle: decision.workshopTitle,
    attendedAt: now.toISOString(),
    method,
    pointsAwarded: decision.pointsAwarded,
  };
}

export const recordAttendanceCallable = defineCallable(
  'attendance-recordAttendance',
  ACCESS,
  (ctx) => recordAttendance(ctx),
);
