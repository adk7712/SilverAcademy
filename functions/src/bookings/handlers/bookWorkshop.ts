// UC #2-2 BookWorkshops: bookings-bookWorkshop callable (LEARNER). Transaction in repo/bookingRepo.ts.
import type { Firestore } from 'firebase-admin/firestore';
import { defineCallable, type Caller } from '../../common';
import { snapshotToIso } from '../controller/decideBooking';
import type { RandomBytes } from '../controller/ticketCode';
import { createBooking } from '../repo/bookingRepo';

export async function bookWorkshop(
  db: Firestore,
  caller: Caller,
  input: { workshopId: string },
  now: Date,
  random?: RandomBytes,
) {
  const r = await createBooking(db, caller, input.workshopId, now, random);
  return { ...r, workshopSnapshot: snapshotToIso(r.workshopSnapshot) };
}

export const bookWorkshopCallable = defineCallable(
  'bookings-bookWorkshop',
  { roles: ['LEARNER'] },
  async ({ input, caller, now, db }) => bookWorkshop(db, caller, input, now),
);
