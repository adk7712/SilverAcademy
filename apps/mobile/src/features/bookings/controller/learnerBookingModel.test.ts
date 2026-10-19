// UC #2-3 tests for the pure ticket cache and grouping logic.
import {
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
