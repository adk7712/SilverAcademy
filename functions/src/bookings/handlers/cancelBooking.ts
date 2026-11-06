import { defineCallable } from '../../common';
import { cancelBooking } from '../repo/bookingRepo';

export const cancelBookingCallable = defineCallable(
  'bookings-cancelBooking',
  { roles: ['LEARNER'] },
  async ({ db, caller, input, now }) => cancelBooking(db, caller, input.workshopId, now),
);
