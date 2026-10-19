// Emulator integration test for attendance-recordAttendance (UC #1-4, #3-4). Run via `npm run test:emulator`.
import { getApps, initializeApp } from 'firebase-admin/app';
import { Timestamp, getFirestore } from 'firebase-admin/firestore';
import type { Role, User } from '@silveracademy/shared';
import { signQr } from '../common';
import { recordAttendance } from './handlers/recordAttendance';

if (getApps().length === 0) initializeApp({ projectId: process.env.GCLOUD_PROJECT });
const db = getFirestore();
const NOW = new Date('2026-10-20T02:10:00Z');
const START = new Date('2026-10-20T02:00:00Z');
const END = new Date('2026-10-20T04:00:00Z');

let seq = 0;
/** Fresh ids per test so suites never share docs. */
async function setup() {
  seq += 1;
  const p = `att${seq}-${Date.now()}`;
  const si = `${p}-si`;
  const vol = `${p}-vol`;
  const w = `${p}-ws`;
  const other = `${p}-ws2`;
  const workshop = (id: string, status = 'OPEN') => ({
    id,
    instructorId: si,
    instructorName: 'Sam',
    title: `Workshop ${id}`,
    status,
    startAt: Timestamp.fromDate(START),
    endAt: Timestamp.fromDate(END),
    attendedCount: 0,
    seatsTaken: 2,
    version: 1,
  });
  await db.doc(`workshops/${w}`).set(workshop(w));
  await db.doc(`workshops/${other}`).set(workshop(other));
  const booking = async (
    workshopId: string,
    learner: string,
    ticketCode: string,
    status = 'CONFIRMED',
  ) => {
    const id = `${workshopId}_${learner}`;
    await db.doc(`bookings/${id}`).set({
      id,
      workshopId,
      learnerId: learner,
      learnerName: `Learner ${learner}`,
      status,
      ticketCode,
      qrPayload: signQr(id),
    });
    return { id, qr: signQr(id), ticketCode };
  };
  const b1 = await booking(w, `${p}-l1`, 'ABCD1234');
  const b2 = await booking(w, `${p}-l2`, 'WXYZ5678');
  const bOther = await booking(other, `${p}-l3`, 'ABCD1234');
  const bCancelled = await booking(w, `${p}-l4`, 'CCCC0000', 'CANCELLED');
  await db.doc(`volunteerAssignments/${w}_${vol}`).set({
    id: `${w}_${vol}`,
    workshopId: w,
    volunteerId: vol,
    status: 'ASSIGNED',
  });
  return { si, vol, w, other, b1, b2, bOther, bCancelled };
}

const caller = (uid: string, roles: Role[]) => ({ uid, roles, user: { uid, roles } as User });
const scan = (
  who: ReturnType<typeof caller>,
  input: { workshopId: string; qrPayload: string } | { workshopId: string; ticketCode: string },
  opts: { ignoreCheckInWindow?: boolean; now?: Date } = {},
) =>
  recordAttendance(
    { input, caller: who, db, now: opts.now ?? NOW },
    { ignoreCheckInWindow: opts.ignoreCheckInWindow ?? false },
  );

const wallet = async (uid: string) => (await db.doc(`wallets/${uid}`).get()).data();
const ledger = async (uid: string) =>
  (await db.collection(`wallets/${uid}/ledger`).get()).docs.map((d) => ({ id: d.id, ...d.data() }));

describe('attendance-recordAttendance (emulator)', () => {
  it('instructor QR scan: attendance, booking ATTENDED, attendedCount, 1 point + earn ledger, audit', async () => {
    const s = await setup();
    const si = caller(s.si, ['LEARNER', 'SENIOR_INSTRUCTOR']);
    const res = await scan(si, { workshopId: s.w, qrPayload: s.b1.qr });
    expect(res).toEqual({
      bookingId: s.b1.id,
      learnerName: expect.stringContaining('Learner'),
      workshopTitle: `Workshop ${s.w}`,
      attendedAt: NOW.toISOString(),
      method: 'QR',
      pointsAwarded: 1,
    });
    const att = (await db.doc(`attendance/${s.b1.id}`).get()).data();
    expect(att).toMatchObject({
      bookingId: s.b1.id,
      workshopId: s.w,
      instructorId: s.si,
      scannedBy: s.si,
      scannedByRole: 'SENIOR_INSTRUCTOR',
      method: 'QR',
      pointsAwarded: 1,
    });
    const booking = (await db.doc(`bookings/${s.b1.id}`).get()).data();
    expect(booking?.status).toBe('ATTENDED');
    expect(booking?.attendedAt.toDate().toISOString()).toBe(NOW.toISOString());
    expect((await db.doc(`workshops/${s.w}`).get()).data()?.attendedCount).toBe(1);
    expect(await wallet(s.si)).toMatchObject({
      balance: 1,
      lifetimeEarned: 1,
      lifetimeRedeemed: 0,
    });
    expect(await ledger(s.si)).toEqual([
      expect.objectContaining({
        id: `earn_${s.b1.id}`,
        type: 'EARN_ATTENDANCE',
        amount: 1,
        balanceAfter: 1,
        bookingId: s.b1.id,
        workshopId: s.w,
      }),
    ]);
    const audit = await db.collection('auditLogs').where('details.bookingId', '==', s.b1.id).get();
    expect(audit.docs.map((d) => d.data())).toEqual([
      expect.objectContaining({ action: 'ATTENDANCE_RECORD', outcome: 'SUCCESS', actorId: s.si }),
    ]);
  });

  it('assigned volunteer, manual ticket code (formatted): points go to the instructor, none to the volunteer', async () => {
    const s = await setup();
    const res = await scan(caller(s.vol, ['VOLUNTEER']), {
      workshopId: s.w,
      ticketCode: 'abcd-1234',
    });
    expect(res).toMatchObject({ bookingId: s.b1.id, method: 'MANUAL', pointsAwarded: 1 });
    expect((await db.doc(`attendance/${s.b1.id}`).get()).data()?.scannedByRole).toBe('VOLUNTEER');
    expect((await wallet(s.si))?.balance).toBe(1);
    expect(await wallet(s.vol)).toBeUndefined();
  });

  it('distinct errors: INVALID_QR, TICKET_NOT_FOUND, WRONG_WORKSHOP, NO_BOOKING, ALREADY_ATTENDED', async () => {
    const s = await setup();
    const si = caller(s.si, ['SENIOR_INSTRUCTOR']);
    const tampered = s.b1.qr.slice(0, -1) + (s.b1.qr.endsWith('A') ? 'B' : 'A');
    await expect(scan(si, { workshopId: s.w, qrPayload: tampered })).rejects.toMatchObject({
      code: 'INVALID_QR',
    });
    await expect(scan(si, { workshopId: s.w, qrPayload: 'hello' })).rejects.toMatchObject({
      code: 'INVALID_QR',
    });
    await expect(scan(si, { workshopId: s.w, ticketCode: 'ZZZZ9999' })).rejects.toMatchObject({
      code: 'TICKET_NOT_FOUND',
    });
    await expect(scan(si, { workshopId: s.w, ticketCode: '???' })).rejects.toMatchObject({
      code: 'TICKET_NOT_FOUND',
    });
    await expect(scan(si, { workshopId: s.w, qrPayload: s.bOther.qr })).rejects.toMatchObject({
      code: 'WRONG_WORKSHOP',
    });
    await expect(
      scan(si, { workshopId: s.w, qrPayload: signQr(`${s.w}_nobody`) }),
    ).rejects.toMatchObject({ code: 'NO_BOOKING' });
    await expect(scan(si, { workshopId: s.w, qrPayload: s.bCancelled.qr })).rejects.toMatchObject({
      code: 'NO_BOOKING',
    });
    await scan(si, { workshopId: s.w, qrPayload: s.b2.qr });
    await expect(scan(si, { workshopId: s.w, ticketCode: s.b2.ticketCode })).rejects.toMatchObject({
      code: 'ALREADY_ATTENDED',
      details: { learnerName: expect.any(String), attendedAt: NOW.toISOString() },
    });
    expect((await wallet(s.si))?.balance).toBe(1);
  });

  it('staff and session checks: NOT_AUTHORISED_FOR_WORKSHOP, SESSION_NOT_ACTIVE, demo override, NOT_FOUND', async () => {
    const s = await setup();
    const input = { workshopId: s.w, qrPayload: s.b1.qr };
    await expect(scan(caller('someone-else', ['SENIOR_INSTRUCTOR']), input)).rejects.toMatchObject({
      code: 'NOT_AUTHORISED_FOR_WORKSHOP',
    });
    await expect(scan(caller(`${s.vol}x`, ['VOLUNTEER']), input)).rejects.toMatchObject({
      code: 'NOT_AUTHORISED_FOR_WORKSHOP',
    });
    const si = caller(s.si, ['SENIOR_INSTRUCTOR']);
    const later = new Date('2026-10-21T00:00:00Z');
    await expect(scan(si, input, { now: later })).rejects.toMatchObject({
      code: 'SESSION_NOT_ACTIVE',
    });
    await expect(scan(si, { workshopId: 'missing-ws', qrPayload: s.b1.qr })).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
    expect((await db.doc(`attendance/${s.b1.id}`).get()).exists).toBe(false);
    await expect(scan(si, input, { now: later, ignoreCheckInWindow: true })).resolves.toMatchObject(
      { pointsAwarded: 1 },
    );
  });

  it('concurrent double scan of one ticket (SI by QR, volunteer by code, repeats): one attendance, one point', async () => {
    const s = await setup();
    const si = caller(s.si, ['SENIOR_INSTRUCTOR']);
    const vol = caller(s.vol, ['VOLUNTEER']);
    const results = await Promise.allSettled([
      scan(si, { workshopId: s.w, qrPayload: s.b1.qr }),
      scan(vol, { workshopId: s.w, ticketCode: s.b1.ticketCode }),
      scan(si, { workshopId: s.w, qrPayload: s.b1.qr }),
      scan(vol, { workshopId: s.w, qrPayload: s.b1.qr }),
    ]);
    const ok = results.filter((r) => r.status === 'fulfilled');
    const failed = results.filter((r): r is PromiseRejectedResult => r.status === 'rejected');
    expect(ok).toHaveLength(1);
    expect(failed.map((r) => (r.reason as { code?: string }).code)).toEqual([
      'ALREADY_ATTENDED',
      'ALREADY_ATTENDED',
      'ALREADY_ATTENDED',
    ]);
    expect(await wallet(s.si)).toMatchObject({ balance: 1, lifetimeEarned: 1 });
    expect(await ledger(s.si)).toHaveLength(1);
    expect((await db.doc(`workshops/${s.w}`).get()).data()?.attendedCount).toBe(1);
    const audits = await db.collection('auditLogs').where('details.bookingId', '==', s.b1.id).get();
    expect(audits.size).toBe(1);
  });
});
