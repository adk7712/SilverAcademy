// UC #1-4 #3-4 schemas for attendance-* callables.
import { z } from 'zod';
import { ATTENDANCE_METHODS } from '../enums';
import { idSchema, isoDateTimeSchema } from './common';

export const recordAttendanceInput = z
  .object({ workshopId: idSchema, qrPayload: z.string().min(1) })
  .strict();
export const recordAttendanceOutput = z.object({
  bookingId: idSchema,
  learnerName: z.string(),
  workshopTitle: z.string(),
  attendedAt: isoDateTimeSchema,
  method: z.enum(ATTENDANCE_METHODS),
  pointsAwarded: z.number().int().nonnegative(),
});

/** Session code set by the instructor; a learner types it to check in (ADR-030). */
const checkInCode = z.string().trim().toUpperCase().min(4).max(12);
export const setCheckInCodeInput = z.object({ workshopId: idSchema, code: checkInCode });
export const setCheckInCodeOutput = z.object({ ok: z.literal(true) });
export const checkInInput = z.object({ bookingId: idSchema, code: checkInCode });
export const checkInOutput = recordAttendanceOutput;
