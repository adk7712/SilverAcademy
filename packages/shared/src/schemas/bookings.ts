// UC #2-2 #2-3 #3-3 schemas for bookings-* callables.
import { z } from 'zod';
import { BOOKING_STATUSES } from '../enums';
import { idSchema, isoDateTimeSchema } from './common';

export const workshopSnapshotSchema = z.object({
  title: z.string(),
  startAt: isoDateTimeSchema,
  endAt: isoDateTimeSchema,
  venueName: z.string(),
  venueAddress: z.string(),
  instructorName: z.string(),
});

export const bookWorkshopInput = z.object({ workshopId: idSchema });
export const bookWorkshopOutput = z.object({
  bookingId: idSchema,
  ticketCode: z.string().min(1),
  qrPayload: z.string().min(1),
  workshopSnapshot: workshopSnapshotSchema,
  seatsRemaining: z.number().int().nonnegative(),
});

export const getRosterInput = z.object({ workshopId: idSchema });
export const getRosterOutput = z.object({
  workshop: z.object({
    id: idSchema,
    title: z.string(),
    startAt: isoDateTimeSchema.nullable(),
    endAt: isoDateTimeSchema.nullable(),
    venue: z.object({ name: z.string(), address: z.string() }).nullable(),
    capacity: z.number().int(),
    seatsTaken: z.number().int(),
    attendedCount: z.number().int(),
  }),
  learners: z.array(
    z.object({
      bookingId: idSchema,
      learnerName: z.string(),
      status: z.enum(BOOKING_STATUSES),
      attendedAt: isoDateTimeSchema.optional(),
    }),
  ),
  volunteers: z.array(z.object({ volunteerId: idSchema, volunteerName: z.string() })),
});
