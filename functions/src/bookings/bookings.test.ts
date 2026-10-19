// UC #2-2 #3-3 unit tests: decideBooking check order, ticket codes, roster access + mapping.
import {
  AppError,
  isValidTicketCode,
  type Booking,
  type TimestampLike,
  type VolunteerAssignment,
  type Workshop,
} from '@silveracademy/shared';
import { decideBooking, snapshotToIso } from './controller/decideBooking';
import { buildRoster, decideRosterAccess } from './controller/decideRoster';
import { generateTicketCode } from './controller/ticketCode';

const ts = (iso: string): TimestampLike => {
  const d = new Date(iso);
  return { seconds: Math.floor(d.getTime() / 1000), nanoseconds: 0, toDate: () => d };
};
const NOW = new Date('2026-10-19T04:00:00Z');
const START = '2026-10-20T02:00:00.000Z';
const END = '2026-10-20T04:00:00.000Z';

const workshop = (over: Partial<Workshop> = {}): Workshop =>
  ({
    id: 'ws1',
    instructorId: 'si1',
    instructorName: 'Mdm Tan',
    title: 'Batik',
    status: 'OPEN',
    capacity: 2,
    seatsTaken: 0,
    attendedCount: 0,
    startAt: ts(START),
    endAt: ts(END),
    venue: { name: 'CC Hall', address: '1 Main St' },
    ...over,
  }) as Workshop;
const booking = (over: Partial<Booking> = {}): Booking =>
  ({
    id: 'ws1_l1',
    status: 'CONFIRMED',
    learnerName: 'A',
    ticketCode: 'ABCD1234',
    ...over,
  }) as Booking;

const codeOf = (fn: () => unknown): string => {
  try {
    fn();
  } catch (e) {
    return (e as AppError).code;
  }
  return 'NO_ERROR';
};

describe('decideBooking', () => {
  const decide = (w: Workshop | undefined, existing?: Booking, uid = 'l1', now = NOW) =>
    decideBooking('ws1', w, existing, uid, now);

  it('confirms with snapshot, seat bump and remaining seats', () => {
    const d = decide(workshop({ seatsTaken: 1 }));
    expect(d).toMatchObject({ bookingId: 'ws1_l1', seatsTakenAfter: 2, seatsRemaining: 0 });
    expect(snapshotToIso(d.workshopSnapshot)).toEqual({
      title: 'Batik',
      startAt: START,
      endAt: END,
      venueName: 'CC Hall',
      venueAddress: '1 Main St',
      instructorName: 'Mdm Tan',
    });
  });

  it.each([
    ['NOT_FOUND', () => decide(undefined, booking())],
    ['CANNOT_BOOK_OWN_WORKSHOP', () => decide(workshop({ status: 'DRAFT' }), booking(), 'si1')],
    [
      'WORKSHOP_NOT_OPEN',
      () => decide(workshop({ status: 'DRAFT', startAt: ts('2020-01-01T00:00:00Z') }), booking()),
    ],
    [
      'WORKSHOP_STARTED',
      () => decide(workshop({ startAt: ts('2020-01-01T00:00:00Z'), seatsTaken: 2 }), booking()),
    ],
    ['ALREADY_BOOKED', () => decide(workshop({ seatsTaken: 2 }), booking())],
    ['WORKSHOP_FULL', () => decide(workshop({ seatsTaken: 2 }))],
  ])('%s wins over every later check', (code, fn) => {
    expect(codeOf(fn)).toBe(code);
  });

  it('startAt == now counts as started', () => {
    expect(codeOf(() => decide(workshop({ startAt: ts(NOW.toISOString()) })))).toBe(
      'WORKSHOP_STARTED',
    );
  });

  it('ALREADY_BOOKED for a cancelled booking too, with bookingId details', () => {
    try {
      decide(workshop(), booking({ status: 'CANCELLED' }));
      throw new Error('expected throw');
    } catch (e) {
      expect(e).toBeInstanceOf(AppError);
      expect(e).toMatchObject({ code: 'ALREADY_BOOKED', details: { bookingId: 'ws1_l1' } });
    }
  });

  it.each(['PENDING_VENUE', 'COMPLETED', 'CANCELLED', 'ARCHIVED'] as const)(
    'status %s -> WORKSHOP_NOT_OPEN',
    (status) => expect(codeOf(() => decide(workshop({ status })))).toBe('WORKSHOP_NOT_OPEN'),
  );

  it('OPEN without schedule or venue is not bookable', () => {
    expect(codeOf(() => decide(workshop({ startAt: null })))).toBe('WORKSHOP_NOT_OPEN');
    expect(codeOf(() => decide(workshop({ venue: null })))).toBe('WORKSHOP_NOT_OPEN');
  });

  it('seatsTaken above capacity (admin lowered it) is full', () => {
    expect(codeOf(() => decide(workshop({ seatsTaken: 3 })))).toBe('WORKSHOP_FULL');
  });
});

describe('generateTicketCode', () => {
  it('maps bytes onto 8 Crockford chars', () => {
    const code = generateTicketCode((n) => Uint8Array.from({ length: n }, (_, i) => i * 37));
    expect(code).toHaveLength(8);
    expect(isValidTicketCode(code)).toBe(true);
    expect(generateTicketCode((n) => new Uint8Array(n).fill(255))).toBe('ZZZZZZZZ');
    expect(generateTicketCode((n) => new Uint8Array(n))).toBe('00000000');
  });
});

describe('decideRosterAccess', () => {
  const assigned = { status: 'ASSIGNED' } as VolunteerAssignment;
  const withdrawn = { status: 'WITHDRAWN' } as VolunteerAssignment;
  const call = (uid: string, roles: string[], a?: VolunteerAssignment, w = workshop()) =>
    codeOf(() => decideRosterAccess(w, { uid, roles: roles as never }, a));

  it('allows admin, owning SI and assigned volunteer', () => {
    expect(call('adm', ['ADMIN'])).toBe('NO_ERROR');
    expect(call('si1', ['SENIOR_INSTRUCTOR'])).toBe('NO_ERROR');
    expect(call('v1', ['VOLUNTEER'], assigned)).toBe('NO_ERROR');
  });

  it('denies in order NOT_FOUND, NOT_ASSIGNED (volunteer), PERMISSION_DENIED (SI not owner)', () => {
    expect(
      codeOf(() => decideRosterAccess(undefined, { uid: 'x', roles: ['ADMIN'] }, undefined)),
    ).toBe('NOT_FOUND');
    expect(call('v1', ['VOLUNTEER'])).toBe('NOT_ASSIGNED');
    expect(call('v1', ['VOLUNTEER'], withdrawn)).toBe('NOT_ASSIGNED');
    expect(call('si2', ['SENIOR_INSTRUCTOR'])).toBe('PERMISSION_DENIED');
    expect(call('si2', ['SENIOR_INSTRUCTOR', 'VOLUNTEER'])).toBe('NOT_ASSIGNED');
  });
});

describe('buildRoster', () => {
  it('hides cancelled bookings and qrPayload, sorts by name, maps times', () => {
    const r = buildRoster(
      'ws1',
      workshop({ seatsTaken: 2 }),
      [
        booking({ id: 'b2', learnerName: 'Zed', qrPayload: 'secret' }),
        booking({ id: 'b1', learnerName: 'Amy', status: 'ATTENDED', attendedAt: ts(END) }),
        booking({ id: 'b3', learnerName: 'Bob', status: 'CANCELLED' }),
      ],
      [
        { volunteerId: 'v1', volunteerName: 'Vee', status: 'ASSIGNED' } as VolunteerAssignment,
        { volunteerId: 'v2', volunteerName: 'Wee', status: 'WITHDRAWN' } as VolunteerAssignment,
      ],
    );
    expect(r.learners.map((l) => l.bookingId)).toEqual(['b1', 'b2']);
    expect(r.learners[0]).toEqual({
      bookingId: 'b1',
      learnerName: 'Amy',
      status: 'ATTENDED',
      attendedAt: END,
    });
    expect(JSON.stringify(r)).not.toContain('secret');
    expect(JSON.stringify(r)).not.toContain('ABCD1234'); // H1: no ticket codes on the roster
    expect(r.volunteers).toEqual([{ volunteerId: 'v1', volunteerName: 'Vee' }]);
    expect(r.workshop).toMatchObject({ id: 'ws1', startAt: START, venue: { name: 'CC Hall' } });
  });

  it('unscheduled workshop maps to null times and venue', () => {
    const r = buildRoster('ws1', workshop({ startAt: null, endAt: null, venue: null }), [], []);
    expect(r.workshop).toMatchObject({ startAt: null, endAt: null, venue: null });
  });
});
