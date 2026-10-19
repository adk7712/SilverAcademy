// UC #1-4 #3-4 schema for attendance-recordAttendance.
import { z } from 'zod';
import { ATTENDANCE_METHODS } from '../enums';
import { idSchema, isoDateTimeSchema } from './common';

const byQr = z.object({ workshopId: idSchema, qrPayload: z.string().min(1) }).strict();
const byTicketCode = z.object({ workshopId: idSchema, ticketCode: z.string().min(1) }).strict();

/** Exactly one of qrPayload / ticketCode (strict objects reject both). */
export const recordAttendanceInput = z.union([byQr, byTicketCode]);
export const recordAttendanceOutput = z.object({
  bookingId: idSchema,
  learnerName: z.string(),
  workshopTitle: z.string(),
  attendedAt: isoDateTimeSchema,
  method: z.enum(ATTENDANCE_METHODS),
  pointsAwarded: z.number().int().nonnegative(),
});
