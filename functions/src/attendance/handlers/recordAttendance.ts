// UC #1-4, #3-4 ScanAttendance: attendance-recordAttendance (QR only), architecture.md 4.3.
import { ATTENDANCE_STAFF_ROLES } from '@silveracademy/shared';
import {
  defineCallable,
  ignoreCheckInWindow,
  verifyQr,
  type CallableContext,
  type CallableResultOf,
  type CallerOptions,
} from '../../common';
import { recordAttendanceTx } from '../repo/attendanceRepo';

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
 * Pre-tx: verifyQr (INVALID_QR). Then one transaction.
 * Exported so tests can call it directly against the emulator.
 */
export async function recordAttendance(
  ctx: Ctx,
  opts: RecordAttendanceOptions = {},
): Promise<CallableResultOf<'attendance-recordAttendance'>> {
  const { input, caller, db, now } = ctx;
  return recordAttendanceTx(db, {
    workshopId: input.workshopId,
    bookingId: verifyQr(input.qrPayload),
    method: 'QR',
    scanner: { uid: caller.uid, roles: caller.roles },
    ignoreCheckInWindow: opts.ignoreCheckInWindow ?? ignoreCheckInWindow(),
    now,
  });
}

export const recordAttendanceCallable = defineCallable(
  'attendance-recordAttendance',
  ACCESS,
  (ctx) => recordAttendance(ctx),
);
