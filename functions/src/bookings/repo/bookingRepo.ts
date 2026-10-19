// UC #2-2 BookWorkshops: booking transaction (architecture.md 4.1). Seat counter + deterministic booking id.
import { randomBytes } from 'node:crypto';
import { FieldValue, type Firestore } from 'firebase-admin/firestore';
import type { Booking, Workshop } from '@silveracademy/shared';
import { ids, notifyTx, paths, refs, runTx, signQr, type Caller } from '../../common';
import { decideBooking } from '../controller/decideBooking';
import { generateTicketCode, type RandomBytes } from '../controller/ticketCode';

export interface BookingResult {
  bookingId: string;
  ticketCode: string;
  qrPayload: string;
  workshopSnapshot: Booking['workshopSnapshot'];
  seatsRemaining: number;
}

/**
 * One tx: read workshop + bookings/{workshopId}_{uid}; decide; create booking, bump seatsTaken, notify learner.
 * Every booking touches the same workshop doc, so Firestore serialises them and a retried loser sees the new count;
 * concurrent duplicates by one learner collide on the booking doc (read + `tx.create`).
 */
export async function createBooking(
  db: Firestore,
  caller: Caller,
  workshopId: string,
  now: Date,
  random: RandomBytes = randomBytes,
): Promise<BookingResult> {
  const workshopRef = refs.workshops(db).doc(workshopId);
  const bookingId = ids.booking(workshopId, caller.uid);
  const bookingRef = refs.bookings(db).doc(bookingId);

  return runTx(db, async (tx) => {
    const [workshopSnap, bookingSnap] = await Promise.all([
      tx.get(workshopRef),
      tx.get(bookingRef),
    ]);
    const workshop: Workshop | undefined = workshopSnap.data();
    const d = decideBooking(workshopId, workshop, bookingSnap.data(), caller.uid, now);

    const ticketCode = generateTicketCode(random);
    const qrPayload = signQr(d.bookingId);
    tx.create(bookingRef, {
      id: d.bookingId,
      workshopId,
      learnerId: caller.uid,
      learnerName: caller.user.displayName,
      status: 'CONFIRMED',
      ticketCode,
      qrPayload,
      workshopSnapshot: d.workshopSnapshot,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    tx.update(workshopRef, {
      seatsTaken: d.seatsTakenAfter,
      updatedAt: FieldValue.serverTimestamp(),
    });
    notifyTx(db, tx, {
      userId: caller.uid,
      type: 'BOOKING_CONFIRMED',
      title: 'Booking confirmed',
      body: `You are booked for ${d.workshopSnapshot.title}. Your ticket is in My Bookings.`,
      refPath: paths.booking(d.bookingId),
    });
    return {
      bookingId: d.bookingId,
      ticketCode,
      qrPayload,
      workshopSnapshot: d.workshopSnapshot,
      seatsRemaining: d.seatsRemaining,
    };
  });
}
