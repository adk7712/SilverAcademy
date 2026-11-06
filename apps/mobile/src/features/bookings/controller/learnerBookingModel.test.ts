// UC #2-3 tests for the pure ticket cache and grouping logic.
import {
  canCancelBooking,
  markBookingCancelled,
  fromStored,
  groupBookings,
  isTicketValid,
  ticketCacheKey,
  toStored,
  type BookingView,
} from './learnerBookingModel';

const view = (over: Partial<BookingView>): BookingView => ({
  id: 'w1_u1',
  workshopId: 'w1',
  status: 'CONFIRMED',
  ticketCode: 'ABCD1234',
  qrPayload: 'SA1.w1_u1.sig',
  title: 'Tai chi',
  startAt: new Date('2026-11-01T02:00:00Z'),
  endAt: new Date('2026-11-01T04:00:00Z'),
  venueName: 'CC',
  venueAddress: '1 Road',
  instructorName: 'Mr Tan',
  attendedAt: null,
  ...over,
});

describe('ticket cache round trip', () => {
  it('keeps payload, code and dates', () => {
    const saved = new Date('2026-10-30T00:00:00Z');
    const stored = JSON.parse(
      JSON.stringify(toStored([view({ attendedAt: new Date('2026-11-01T02:05:00Z') })], saved)),
    );
    const back = fromStored(stored);
    expect(back?.savedAt.toISOString()).toBe(saved.toISOString());
    expect(back?.bookings[0]?.qrPayload).toBe('SA1.w1_u1.sig');
    expect(back?.bookings[0]?.startAt).toEqual(new Date('2026-11-01T02:00:00Z'));
    expect(back?.bookings[0]?.attendedAt).toEqual(new Date('2026-11-01T02:05:00Z'));
  });
  it('rejects corrupt content', () => {
    expect(fromStored(null)).toBeNull();
    expect(fromStored({ savedAt: 1 })).toBeNull();
    expect(fromStored({ savedAt: 'x', bookings: [{ id: 1 }, 'bad'] })?.bookings).toEqual([]);
  });
  it('keys per user', () => {
    expect(ticketCacheKey('u1')).toBe('tickets:v1:u1');
  });
});

describe('groupBookings', () => {
  const now = new Date('2026-10-31T00:00:00Z');
  it('splits upcoming from past/cancelled and orders them', () => {
    const later = view({
      id: 'b',
      startAt: new Date('2026-12-01T02:00:00Z'),
      endAt: new Date('2026-12-01T04:00:00Z'),
    });
    const sooner = view({ id: 'a' });
    const cancelled = view({ id: 'c', status: 'CANCELLED' });
    const attended = view({
      id: 'd',
      status: 'ATTENDED',
      startAt: new Date('2026-09-01T02:00:00Z'),
      endAt: new Date('2026-09-01T04:00:00Z'),
    });
    const { upcoming, past } = groupBookings([later, cancelled, attended, sooner], now);
    expect(upcoming.map((b) => b.id)).toEqual(['a', 'b']);
    expect(past.map((b) => b.id)).toEqual(['c', 'd']);
  });
  it('cancelled tickets are invalid', () => {
    expect(isTicketValid({ status: 'CANCELLED' })).toBe(false);
    expect(isTicketValid({ status: 'ATTENDED' })).toBe(true);
  });
});

describe('learner cancellation', () => {
  const now = new Date('2026-10-31T00:00:00Z');
  it('only offers cancellation for confirmed bookings strictly before start', () => {
    expect(canCancelBooking(view({}), now)).toBe(true);
    expect(canCancelBooking(view({}), view({}).startAt)).toBe(false);
    expect(canCancelBooking(view({}), view({}).endAt)).toBe(false);
    expect(canCancelBooking(view({ status: 'ATTENDED' }), now)).toBe(false);
    expect(canCancelBooking(view({ status: 'CANCELLED' }), now)).toBe(false);
  });
  it('persists cancellation in the offline cache and removes it from upcoming tickets', () => {
    const original = [view({}), view({ id: 'other' })];
    const updated = markBookingCancelled(original, 'w1_u1');
    const restored = fromStored(JSON.parse(JSON.stringify(toStored(updated, now))))!.bookings;
    expect(original[0]?.status).toBe('CONFIRMED');
    expect(isTicketValid(restored[0]!)).toBe(false);
    expect(groupBookings(restored, now).upcoming.map((b) => b.id)).toEqual(['other']);
  });
});
