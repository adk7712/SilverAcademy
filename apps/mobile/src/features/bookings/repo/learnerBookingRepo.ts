// UC #2-3 ViewTicket: direct read of own bookings plus the offline ticket mirror in AsyncStorage (ADR-019).
import { collection, getDocs, orderBy, query, where } from 'firebase/firestore';
import type { Booking } from '@silveracademy/shared';
import { firestore } from '../../../services/firebase';
import { readStored, writeStored } from '../../../services/storage';
import {
  fromStored,
  ticketCacheKey,
  toBookingView,
  toStored,
  type BookingView,
} from '../controller/learnerBookingModel';

const FETCH_TIMEOUT_MS = 8000;

/** Firestore on React Native has no offline error for reads, so a stalled read counts as offline. */
const timeout = () =>
  new Promise<never>((_, reject) =>
    setTimeout(() => reject({ code: 'unavailable' }), FETCH_TIMEOUT_MS),
  );

export async function fetchOwnBookings(uid: string): Promise<BookingView[]> {
  const q = query(
    collection(firestore, 'bookings'),
    where('learnerId', '==', uid),
    orderBy('createdAt', 'desc'),
  );
  const snap = await Promise.race([getDocs(q), timeout()]);
  return snap.docs.map((d) => toBookingView({ ...(d.data() as Booking), id: d.id }));
}

export async function cacheTickets(uid: string, views: readonly BookingView[]): Promise<void> {
  await writeStored(ticketCacheKey(uid), toStored(views, new Date()));
}

export async function readCachedTickets(uid: string) {
  return fromStored(await readStored<unknown>(ticketCacheKey(uid)));
}
