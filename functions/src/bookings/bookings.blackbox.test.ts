// Lab 4: Black-box tests for workshop booking (UC #2-2)

import { AppError, type Booking, type TimestampLike, type Workshop } from '@silveracademy/shared';

import { decideBooking } from './controller/decideBooking';

const NOW = new Date('2026-10-19T04:00:00.000Z');
const START = '2026-10-20T02:00:00.000Z';
const END = '2026-10-20T04:00:00.000Z';

// Convert a date string to a timestamp
const ts = (iso: string): TimestampLike => {
  const date = new Date(iso);

  return {
    seconds: Math.floor(date.getTime() / 1000),
    nanoseconds: 0,
    toDate: () => date,
  };
};

// Create a workshop with valid default values
const workshop = (overrides: Partial<Workshop> = {}): Workshop =>
  ({
    id: 'ws1',
    instructorId: 'si1',
    instructorName: 'Mdm Tan',
    title: 'Batik',
    status: 'OPEN',
    capacity: 20,
    seatsTaken: 10,
    attendedCount: 0,
    startAt: ts(START),
    endAt: ts(END),
    venue: {
      name: 'CC Hall',
      address: '1 Main St',
    },
    ...overrides,
  }) as Workshop;

// Create an existing confirmed booking
const booking = (overrides: Partial<Booking> = {}): Booking =>
  ({
    id: 'ws1_l1',
    workshopId: 'ws1',
    learnerId: 'l1',
    learnerName: 'Learner One',
    status: 'CONFIRMED',
    ticketCode: 'ABCD1234',
    ...overrides,
  }) as Booking;

// Call the booking controller
const decide = (
  selectedWorkshop: Workshop | undefined,
  existing?: Booking,
  uid = 'l1',
  now = NOW,
) => decideBooking('ws1', selectedWorkshop, existing, uid, now);

// Get the error code when a booking is rejected
const errorCode = (action: () => unknown): string => {
  try {
    action();
  } catch (error) {
    if (error instanceof AppError) {
      return error.code;
    }
    throw error;
  }

  return 'NO_ERROR';
};

// Print the actual output for each test
const showActual = (testId: string, actual: unknown): void => {
  console.log(`${testId} Actual Output:`, actual);
};

describe('SC2006 Lab 4 - BookingController black-box testing', () => {
  // Equivalence Class Testing
  //TC0
  it('TC01: approves booking with all default valid inputs', () => {
    const actual = decide(workshop());

    showActual('TC01', actual);

    expect(actual).toMatchObject({
      bookingId: 'ws1_l1',
      seatsTakenAfter: 11,
      seatsRemaining: 9,
    });
  });

  //TC02
  it('TC02: rejects a missing workshop', () => {
    const actual = errorCode(() => decide(undefined));

    showActual('TC02', actual);

    expect(actual).toBe('NOT_FOUND');
  });

  //TC03
  it('TC03: rejects a learner booking their own workshop', () => {
    const actual = errorCode(() => decide(workshop({ instructorId: 'l1' })));

    showActual('TC03', actual);

    expect(actual).toBe('CANNOT_BOOK_OWN_WORKSHOP');
  });

  //TC04
  it('TC04: rejects a workshop in DRAFT status', () => {
    const actual = errorCode(() => decide(workshop({ status: 'DRAFT' })));

    showActual('TC04', actual);

    expect(actual).toBe('WORKSHOP_NOT_OPEN');
  });

  //TC05
  it('TC05: rejects an existing confirmed booking', () => {
    const actual = errorCode(() => decide(workshop(), booking()));

    showActual('TC05', actual);

    expect(actual).toBe('ALREADY_BOOKED');
  });

  // Boundary Value Testing - Workshop Capacity

  //TC06
  it('TC06: allows the final available seat (19 of 20 occupied)', () => {
    const actual = decide(
      workshop({
        capacity: 20,
        seatsTaken: 19,
      }),
    );

    showActual('TC06', actual);

    expect(actual).toMatchObject({
      bookingId: 'ws1_l1',
      seatsTakenAfter: 20,
      seatsRemaining: 0,
    });
  });

  //TC07
  it('TC07: rejects a full workshop (20 of 20 occupied)', () => {
    const actual = errorCode(() =>
      decide(
        workshop({
          capacity: 20,
          seatsTaken: 20,
        }),
      ),
    );

    showActual('TC07', actual);

    expect(actual).toBe('WORKSHOP_FULL');
  });

  //TC08
  it('TC08: rejects an over-capacity workshop (21 of 20 occupied)', () => {
    const actual = errorCode(() =>
      decide(
        workshop({
          capacity: 20,
          seatsTaken: 21,
        }),
      ),
    );

    showActual('TC08', actual);

    expect(actual).toBe('WORKSHOP_FULL');
  });

  // Boundary Value Testing - Workshop Start Time

  //TC09
  it('TC09: approves booking 1 second before the session begins', () => {
    const startAt = ts(new Date(NOW.getTime() + 1000).toISOString());

    const actual = decide(workshop({ startAt }));

    showActual('TC09', actual);

    expect(actual).toMatchObject({
      bookingId: 'ws1_l1',
      seatsTakenAfter: 11,
      seatsRemaining: 9,
    });
  });

  //TC10
  it('TC10: rejects booking exactly when the session begins', () => {
    const startAt = ts(NOW.toISOString());

    const actual = errorCode(() => decide(workshop({ startAt })));

    showActual('TC10', actual);

    expect(actual).toBe('WORKSHOP_STARTED');
  });

  //TC11
  it('TC11: rejects booking 1 second after the session begins', () => {
    const startAt = ts(new Date(NOW.getTime() - 1000).toISOString());

    const actual = errorCode(() => decide(workshop({ startAt })));

    showActual('TC11', actual);

    expect(actual).toBe('WORKSHOP_STARTED');
  });
});
