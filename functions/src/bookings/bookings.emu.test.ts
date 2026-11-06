// UC #2-2 #3-3 emulator integration: booking tx atomicity + concurrency, roster reads. Run via `npm run test:emulator`.
import { getApps, initializeApp } from 'firebase-admin/app';
import { Timestamp, getFirestore } from 'firebase-admin/firestore';
import type { Role, User } from '@silveracademy/shared';
import { verifyQr, type Caller } from '../common';
import { recordAttendance } from '../attendance/handlers/recordAttendance';
import { adminSetStatus } from '../workshops/repo/adminWorkshopRepo';
import { cancelBooking } from './repo/bookingRepo';
import { bookWorkshop } from './handlers/bookWorkshop';
import { getRoster } from './handlers/getRoster';

if (getApps().length === 0) initializeApp({ projectId: process.env.GCLOUD_PROJECT });
const db = getFirestore();
const NOW = new Date('2026-10-19T04:00:00Z');
const START = new Date('2026-10-25T02:00:00Z');
const END = new Date('2026-10-25T04:00:00Z');
let seq = 0;

const caller = (uid: string, roles: Role[] = ['LEARNER']): Caller => ({
  uid,
  roles,
  user: { uid, displayName: `Name ${uid}`, roles, status: 'ACTIVE' } as User,
});

async function makeWorkshop(capacity: number, over: Record<string, unknown> = {}): Promise<string> {
  seq += 1;
  const id = `bk-ws-${seq}-${Date.now()}`;
  await db.doc(`workshops/${id}`).set({
    id,
    instructorId: 'si-owner',
    instructorName: 'Mdm Tan',
    title: `Workshop ${seq}`,
    status: 'OPEN',
    capacity,
    seatsTaken: 0,
    attendedCount: 0,
    startAt: Timestamp.fromDate(START),
    endAt: Timestamp.fromDate(END),
    venue: {
      facilityId: 'f1',
      name: 'CC Hall',
      address: '1 Main St',
      postalCode: '123456',
      lat: 1.3,
      lng: 103.8,
      partnerId: 'cp1',
    },
    version: 1,
    ...over,
  });
  return id;
}

const book = (workshopId: string, uid: string) =>
  bookWorkshop(db, caller(uid), { workshopId }, NOW);
const seats = async (id: string) => (await db.doc(`workshops/${id}`).get()).data()?.seatsTaken;
const bookingsOf = async (id: string) =>
  (await db.collection('bookings').where('workshopId', '==', id).get()).docs.map((d) => d.data());

describe('bookings-bookWorkshop (emulator)', () => {
  it('creates the ticket, bumps seats and notifies in one commit', async () => {
    const id = await makeWorkshop(3);
    const res = await book(id, 'learner-a');
    expect(res).toMatchObject({
      bookingId: `${id}_learner-a`,
      seatsRemaining: 2,
      workshopSnapshot: {
        startAt: START.toISOString(),
        venueName: 'CC Hall',
        instructorName: 'Mdm Tan',
      },
    });
    expect(verifyQr(res.qrPayload)).toBe(res.bookingId);
    const stored = (await db.doc(`bookings/${res.bookingId}`).get()).data();
    expect(stored).toMatchObject({
      id: res.bookingId,
      learnerId: 'learner-a',
      learnerName: 'Name learner-a',
      status: 'CONFIRMED',
      ticketCode: res.ticketCode,
      qrPayload: res.qrPayload,
    });
    expect((stored?.workshopSnapshot.startAt as Timestamp).toDate()).toEqual(START);
    expect(await seats(id)).toBe(1);
    const notes = await db
      .collection('notifications')
      .where('userId', '==', 'learner-a')
      .where('refPath', '==', `bookings/${res.bookingId}`)
      .get();
    expect(notes.docs.map((d) => d.data())).toEqual([
      expect.objectContaining({ type: 'BOOKING_CONFIRMED', read: false }),
    ]);
  });

  it('a rejected booking writes nothing', async () => {
    const id = await makeWorkshop(1, { seatsTaken: 1 });
    await expect(book(id, 'learner-b')).rejects.toMatchObject({ code: 'WORKSHOP_FULL' });
    expect(await seats(id)).toBe(1);
    expect(await bookingsOf(id)).toEqual([]);
    const notes = await db.collection('notifications').where('userId', '==', 'learner-b').get();
    expect(notes.empty).toBe(true);
  });

  it('maps rule failures: NOT_FOUND, CANNOT_BOOK_OWN_WORKSHOP, WORKSHOP_NOT_OPEN, WORKSHOP_STARTED, ALREADY_BOOKED', async () => {
    await expect(book('no-such-ws', 'l')).rejects.toMatchObject({ code: 'NOT_FOUND' });
    const id = await makeWorkshop(5);
    await expect(book(id, 'si-owner')).rejects.toMatchObject({ code: 'CANNOT_BOOK_OWN_WORKSHOP' });
    const draft = await makeWorkshop(5, { status: 'PENDING_VENUE' });
    await expect(book(draft, 'l')).rejects.toMatchObject({ code: 'WORKSHOP_NOT_OPEN' });
    const past = await makeWorkshop(5, {
      startAt: Timestamp.fromDate(new Date('2026-10-18T00:00:00Z')),
    });
    await expect(book(past, 'l')).rejects.toMatchObject({ code: 'WORKSHOP_STARTED' });
    await book(id, 'learner-c');
    await expect(book(id, 'learner-c')).rejects.toMatchObject({
      code: 'ALREADY_BOOKED',
      details: { bookingId: `${id}_learner-c` },
    });
    expect(await seats(id)).toBe(1);
  });

  it('20 learners in parallel on capacity 5 -> exactly 5 CONFIRMED, 15 WORKSHOP_FULL', async () => {
    const id = await makeWorkshop(5);
    const results = await Promise.allSettled(
      Array.from({ length: 20 }, (_, i) => book(id, `crowd-${i}`)),
    );
    const ok = results.filter((r) => r.status === 'fulfilled');
    const codes = results
      .filter((r): r is PromiseRejectedResult => r.status === 'rejected')
      .map((r) => (r.reason as { code?: string }).code);
    expect(ok).toHaveLength(5);
    expect(codes).toEqual(Array(15).fill('WORKSHOP_FULL'));
    expect(await seats(id)).toBe(5);
    const stored = await bookingsOf(id);
    expect(stored).toHaveLength(5);
    expect(stored.every((b) => b.status === 'CONFIRMED')).toBe(true);
  });

  it('same learner twice in parallel -> one booking, one ALREADY_BOOKED', async () => {
    const id = await makeWorkshop(5);
    const results = await Promise.allSettled([book(id, 'double'), book(id, 'double')]);
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    const rejected = results.find((r): r is PromiseRejectedResult => r.status === 'rejected');
    expect(rejected?.reason).toMatchObject({ code: 'ALREADY_BOOKED' });
    expect(await seats(id)).toBe(1);
    expect(await bookingsOf(id)).toHaveLength(1);
  });
});

describe('bookings-getRoster (emulator)', () => {
  let id = '';
  beforeAll(async () => {
    id = await makeWorkshop(5);
    await book(id, 'r-learner-1');
    await book(id, 'r-learner-2');
    await db.doc(`bookings/${id}_r-learner-2`).update({ status: 'CANCELLED' });
    await db.doc(`volunteerAssignments/${id}_vol-1`).set({
      id: `${id}_vol-1`,
      workshopId: id,
      volunteerId: 'vol-1',
      volunteerName: 'Vol One',
      status: 'ASSIGNED',
    });
  });

  it('owner, admin and assigned volunteer see CONFIRMED/ATTENDED learners without qrPayload', async () => {
    for (const c of [
      caller('si-owner', ['SENIOR_INSTRUCTOR']),
      caller('admin', ['ADMIN']),
      caller('vol-1', ['VOLUNTEER']),
    ]) {
      const r = await getRoster(db, c, { workshopId: id });
      expect(r.learners.map((l) => l.bookingId)).toEqual([`${id}_r-learner-1`]);
      expect(r.volunteers).toEqual([{ volunteerId: 'vol-1', volunteerName: 'Vol One' }]);
      expect(r.workshop).toMatchObject({
        id,
        seatsTaken: 2,
        capacity: 5,
        venue: { name: 'CC Hall' },
      });
      expect(JSON.stringify(r)).not.toContain('SA1.');
      expect(JSON.stringify(r)).not.toContain('ticketCode');
    }
  });

  it('denies other SI (PERMISSION_DENIED), unassigned volunteer (NOT_ASSIGNED), missing workshop', async () => {
    await expect(
      getRoster(db, caller('si-other', ['SENIOR_INSTRUCTOR']), { workshopId: id }),
    ).rejects.toMatchObject({ code: 'PERMISSION_DENIED' });
    await expect(
      getRoster(db, caller('vol-2', ['VOLUNTEER']), { workshopId: id }),
    ).rejects.toMatchObject({ code: 'NOT_ASSIGNED' });
    await expect(
      getRoster(db, caller('admin', ['ADMIN']), { workshopId: 'missing' }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });
});

describe('bookings-cancelBooking (emulator)', () => {
  it('concurrent retries free one seat and retain an invalid ticket', async () => {
    const id = await makeWorkshop(1);
    const ticket = await book(id, 'cancel-owner');
    const cancel = () => cancelBooking(db, caller('cancel-owner'), id, NOW);
    const results = await Promise.all([cancel(), cancel()]);
    expect(results).toEqual([
      { bookingId: ticket.bookingId, status: 'CANCELLED' },
      { bookingId: ticket.bookingId, status: 'CANCELLED' },
    ]);
    expect(await seats(id)).toBe(0);
    const stored = (await db.doc(`bookings/${ticket.bookingId}`).get()).data();
    expect(stored).toMatchObject({
      status: 'CANCELLED',
      ticketCode: ticket.ticketCode,
      qrPayload: ticket.qrPayload,
    });
    await expect(book(id, 'cancel-owner')).rejects.toMatchObject({ code: 'ALREADY_BOOKED' });
    await book(id, 'replacement-learner');
    expect(await seats(id)).toBe(1);
  });
  it('another learner cannot cancel the owner ticket', async () => {
    const id = await makeWorkshop(1);
    await book(id, 'private-owner');
    await expect(cancelBooking(db, caller('stranger'), id, NOW)).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
    expect(await seats(id)).toBe(1);
    expect((await bookingsOf(id))[0]?.status).toBe('CONFIRMED');
  });
  it('rejected cancellation leaves booking and seat unchanged', async () => {
    const id = await makeWorkshop(1);
    await book(id, 'late-learner');
    await expect(cancelBooking(db, caller('late-learner'), id, START)).rejects.toMatchObject({
      code: 'WORKSHOP_STARTED',
    });
    expect(await seats(id)).toBe(1);
    expect((await bookingsOf(id))[0]?.status).toBe('CONFIRMED');
  });
  it('concurrent booking and cancellation preserve the seat count', async () => {
    const id = await makeWorkshop(2);
    await book(id, 'leaving-learner');
    await Promise.all([
      cancelBooking(db, caller('leaving-learner'), id, NOW),
      book(id, 'arriving-learner'),
    ]);
    expect(await seats(id)).toBe(1);
    expect((await bookingsOf(id)).filter((b) => b.status === 'CONFIRMED')).toHaveLength(1);
  });
});

describe('cancelled booking integrations (emulator)', () => {
  it('rejects the cancelled QR and manual ticket without recording attendance', async () => {
    const id = await makeWorkshop(1);
    const ticket = await book(id, 'invalid-ticket');
    await cancelBooking(db, caller('invalid-ticket'), id, NOW);
    for (const input of [
      { workshopId: id, qrPayload: ticket.qrPayload },
      { workshopId: id, ticketCode: ticket.ticketCode },
    ]) {
      await expect(
        recordAttendance({
          db,
          caller: caller('si-owner', ['SENIOR_INSTRUCTOR']),
          input,
          now: START,
        }),
      ).rejects.toMatchObject({ code: 'NO_BOOKING' });
    }
    expect((await db.doc(`attendance/${ticket.bookingId}`).get()).exists).toBe(false);
    expect(await seats(id)).toBe(0);
  });
  it('serializes learner and admin cancellation without freeing another learner seat twice', async () => {
    const id = await makeWorkshop(2);
    await book(id, 'admin-race-a');
    await book(id, 'admin-race-b');
    await Promise.all([
      cancelBooking(db, caller('admin-race-a'), id, NOW),
      adminSetStatus(
        db,
        caller('admin', ['ADMIN']),
        {
          workshopId: id,
          status: 'CANCELLED',
          reason: 'Venue closed',
          confirmImpact: true,
          expectedVersion: 1,
        },
        NOW,
      ),
    ]);
    expect(await seats(id)).toBe(0);
    expect((await bookingsOf(id)).map((b) => b.status)).toEqual(['CANCELLED', 'CANCELLED']);
  });
});
