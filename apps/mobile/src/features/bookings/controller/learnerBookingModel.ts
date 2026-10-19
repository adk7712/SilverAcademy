// UC #2-3 ViewTicket: pure view model, cache (de)serialisation and grouping for Learner bookings (ADR-019).
import type { Booking, BookingStatus } from '@silveracademy/shared';

export interface BookingView {
  id: string;
  workshopId: string;
  status: BookingStatus;
  ticketCode: string;
  qrPayload: string;
  title: string;
  startAt: Date;
  endAt: Date;
  venueName: string;
  venueAddress: string;
  instructorName: string;
  attendedAt: Date | null;
}

/** JSON-safe copy kept in AsyncStorage (dates as ISO strings). */
export interface StoredBooking extends Omit<BookingView, 'startAt' | 'endAt' | 'attendedAt'> {
  startAt: string;
  endAt: string;
  attendedAt: string | null;
}

export interface StoredTickets {
  savedAt: string;
  bookings: StoredBooking[];
}

export const ticketCacheKey = (uid: string) => `tickets:v1:${uid}`;

export function toBookingView(b: Booking): BookingView {
  const s = b.workshopSnapshot;
  return {
    id: b.id,
    workshopId: b.workshopId,
    status: b.status,
    ticketCode: b.ticketCode,
    qrPayload: b.qrPayload,
    title: s.title,
    startAt: s.startAt.toDate(),
    endAt: s.endAt.toDate(),
    venueName: s.venueName,
    venueAddress: s.venueAddress,
    instructorName: s.instructorName,
    attendedAt: b.attendedAt ? b.attendedAt.toDate() : null,
  };
}

export function toStored(views: readonly BookingView[], savedAt: Date): StoredTickets {
  return {
    savedAt: savedAt.toISOString(),
    bookings: views.map((v) => ({
      ...v,
      startAt: v.startAt.toISOString(),
      endAt: v.endAt.toISOString(),
      attendedAt: v.attendedAt ? v.attendedAt.toISOString() : null,
    })),
  };
}

const isStoredBooking = (b: unknown): b is StoredBooking => {
  if (typeof b !== 'object' || b === null) return false;
  const r = b as Record<string, unknown>;
  return (
    typeof r.id === 'string' &&
    typeof r.qrPayload === 'string' &&
    typeof r.ticketCode === 'string' &&
    typeof r.startAt === 'string'
  );
};

/** Tolerates missing or corrupt cache content: returns null instead of throwing. */
export function fromStored(raw: unknown): { savedAt: Date; bookings: BookingView[] } | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const r = raw as Partial<StoredTickets>;
  if (typeof r.savedAt !== 'string' || !Array.isArray(r.bookings)) return null;
  const bookings = r.bookings.filter(isStoredBooking).map((b) => ({
    ...b,
    startAt: new Date(b.startAt),
    endAt: new Date(b.endAt),
    attendedAt: b.attendedAt ? new Date(b.attendedAt) : null,
  }));
  return { savedAt: new Date(r.savedAt), bookings };
}

/** Upcoming = CONFIRMED and not yet ended, soonest first; the rest newest first. */
export function groupBookings(views: readonly BookingView[], now: Date) {
  const upcoming = views
    .filter((b) => b.status === 'CONFIRMED' && b.endAt.getTime() >= now.getTime())
    .sort((a, b) => a.startAt.getTime() - b.startAt.getTime());
  const upcomingIds = new Set(upcoming.map((b) => b.id));
  const past = views
    .filter((b) => !upcomingIds.has(b.id))
    .sort((a, b) => b.startAt.getTime() - a.startAt.getTime());
  return { upcoming, past };
}

/** QR and code are only meaningful for a live booking. */
export const isTicketValid = (b: Pick<BookingView, 'status'>) => b.status !== 'CANCELLED';
