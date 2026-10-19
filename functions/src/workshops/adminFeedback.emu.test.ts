// Emulator integration test: feedback eligibility (UC #2-4, ADR-022) and admin workshop edit / status / cancel (UC #5-2, #5-3).
import { getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { adminSetStatus, adminUpdateWorkshop } from './repo/adminWorkshopRepo';
import { submitFeedback } from './repo/feedbackRepo';

if (getApps().length === 0) initializeApp({ projectId: process.env.GCLOUD_PROJECT });
const db = getFirestore();
const RUN = Date.now().toString(36);
const NOW = new Date('2026-10-19T04:00:00Z');
const admin = { uid: `st_admin_${RUN}` };
const DAY = 24 * 60 * 60 * 1000;
const codeOf = async (p: Promise<unknown>): Promise<string | undefined> => {
  try {
    await p;
  } catch (e) {
    return (e as { code?: string }).code;
  }
};

interface Fixture {
  wid: string;
  instructor: string;
  facility: string;
  slot: string;
}

/** Workshop starting `startOffsetDays` from NOW (2h long), with an approved instructor profile and a booked slot. */
async function seedWorkshop(
  name: string,
  startOffsetDays: number,
  extra: object = {},
): Promise<Fixture> {
  const wid = `w_${name}_${RUN}`;
  const instructor = `sp_si_${name}_${RUN}`;
  const facility = `f_${name}_${RUN}`;
  const slot = `s_${name}_${RUN}`;
  const startAt = Timestamp.fromDate(new Date(NOW.getTime() + startOffsetDays * DAY));
  const endAt = Timestamp.fromDate(new Date(NOW.getTime() + startOffsetDays * DAY + 2 * 3600_000));
  await db
    .doc(`instructorProfiles/${instructor}`)
    .set({ uid: instructor, status: 'APPROVED', ratingSum: 0, ratingCount: 0, version: 1 });
  await db.doc(`facilities/${facility}/slots/${slot}`).set({
    id: slot,
    facilityId: facility,
    status: 'BOOKED',
    bookedWorkshopId: wid,
    bookedRequestId: 'r1',
    startAt,
    endAt,
  });
  await db.doc(`workshops/${wid}`).set({
    id: wid,
    instructorId: instructor,
    instructorName: 'Ins',
    title: 'Baking',
    description: 'd',
    category: 'COOKING',
    capacity: 10,
    materials: '',
    status: 'OPEN',
    seatsTaken: 0,
    attendedCount: 0,
    needsVolunteers: false,
    volunteerSlots: 0,
    volunteersAssigned: 0,
    activeVenueRequestId: null,
    slotId: slot,
    startAt,
    endAt,
    venue: {
      facilityId: facility,
      name: 'V',
      address: 'A',
      postalCode: '123456',
      lat: 1.3,
      lng: 103.8,
      partnerId: 'p',
    },
    ratingSum: 0,
    ratingCount: 0,
    version: 1,
    ...extra,
  });
  return { wid, instructor, facility, slot };
}

async function seedBooking(
  f: Fixture,
  learner: string,
  status: 'CONFIRMED' | 'ATTENDED',
): Promise<string> {
  const id = `${f.wid}_${learner}`;
  await db
    .doc(`bookings/${id}`)
    .set({ id, workshopId: f.wid, learnerId: learner, learnerName: learner, status });
  if (status === 'ATTENDED') {
    await db
      .doc(`attendance/${id}`)
      .set({ bookingId: id, workshopId: f.wid, learnerId: learner, instructorId: f.instructor });
  }
  await db
    .doc(`workshops/${f.wid}`)
    .update({ seatsTaken: (await db.doc(`workshops/${f.wid}`).get()).data()?.seatsTaken + 1 });
  return id;
}

describe('workshops-submitFeedback (emulator)', () => {
  it('attended learner inside the window: creates feedback and bumps both aggregates', async () => {
    const f = await seedWorkshop('fb1', -1); // ended ~1 day ago
    const learner = `sp_l1_${RUN}`;
    const bid = await seedBooking(f, learner, 'ATTENDED');
    const res = await submitFeedback(
      db,
      { uid: learner },
      { workshopId: f.wid, rating: 4, comment: 'Great', tags: ['fun'] },
      NOW,
    );
    expect(res).toEqual({ feedbackId: bid });
    expect((await db.doc(`feedback/${bid}`).get()).data()).toMatchObject({
      bookingId: bid,
      learnerId: learner,
      instructorId: f.instructor,
      rating: 4,
      comment: 'Great',
      tags: ['fun'],
    });
    expect((await db.doc(`workshops/${f.wid}`).get()).data()).toMatchObject({
      ratingSum: 4,
      ratingCount: 1,
    });
    expect((await db.doc(`instructorProfiles/${f.instructor}`).get()).data()).toMatchObject({
      ratingSum: 4,
      ratingCount: 1,
    });
  });

  it('not attended (booked only, or no booking) is NOT_ATTENDED and writes nothing', async () => {
    const f = await seedWorkshop('fb2', -1);
    const learner = `sp_l2_${RUN}`;
    await seedBooking(f, learner, 'CONFIRMED');
    expect(
      await codeOf(submitFeedback(db, { uid: learner }, { workshopId: f.wid, rating: 5 }, NOW)),
    ).toBe('NOT_ATTENDED');
    expect(
      await codeOf(submitFeedback(db, { uid: 'nobody' }, { workshopId: f.wid, rating: 5 }, NOW)),
    ).toBe('NOT_ATTENDED');
    expect(
      await codeOf(submitFeedback(db, { uid: learner }, { workshopId: 'nope', rating: 5 }, NOW)),
    ).toBe('NOT_FOUND');
    expect((await db.doc(`workshops/${f.wid}`).get()).data()).toMatchObject({
      ratingSum: 0,
      ratingCount: 0,
    });
  });

  it('closed after 7 days, still open on day 7', async () => {
    const f = await seedWorkshop('fb3', -8); // ended 8 days - 2h before NOW: closed
    const learner = `sp_l3_${RUN}`;
    await seedBooking(f, learner, 'ATTENDED');
    expect(
      await codeOf(submitFeedback(db, { uid: learner }, { workshopId: f.wid, rating: 3 }, NOW)),
    ).toBe('FEEDBACK_WINDOW_CLOSED');
    const g = await seedWorkshop('fb3b', -6); // ended ~6 days ago: open
    await seedBooking(g, learner, 'ATTENDED');
    await expect(
      submitFeedback(db, { uid: learner }, { workshopId: g.wid, rating: 3 }, NOW),
    ).resolves.toBeDefined();
  });

  it('duplicates are ALREADY_SUBMITTED; concurrent duplicates count once', async () => {
    const f = await seedWorkshop('fb4', -1);
    const learner = `sp_l4_${RUN}`;
    await seedBooking(f, learner, 'ATTENDED');
    const go = () =>
      codeOf(submitFeedback(db, { uid: learner }, { workshopId: f.wid, rating: 5 }, NOW));
    const results = await Promise.all([go(), go(), go()]);
    expect(results.filter((c) => c === undefined)).toHaveLength(1);
    expect(results.filter((c) => c === 'ALREADY_SUBMITTED')).toHaveLength(2);
    expect(await go()).toBe('ALREADY_SUBMITTED');
    expect((await db.doc(`workshops/${f.wid}`).get()).data()).toMatchObject({
      ratingSum: 5,
      ratingCount: 1,
    });
    expect((await db.doc(`instructorProfiles/${f.instructor}`).get()).data()).toMatchObject({
      ratingSum: 5,
      ratingCount: 1,
    });
  });
});

describe('workshops-adminUpdateWorkshop (emulator)', () => {
  it('edits with audit and version bump; guards stale / capacity', async () => {
    const f = await seedWorkshop('ed1', 3);
    await seedBooking(f, `sp_a_${RUN}`, 'CONFIRMED');
    await seedBooking(f, `sp_b_${RUN}`, 'CONFIRMED');
    expect(
      await adminUpdateWorkshop(
        db,
        admin,
        { workshopId: f.wid, patch: { title: 'Sourdough', capacity: 12 }, expectedVersion: 1 },
        NOW,
      ),
    ).toEqual({ version: 2 });
    expect((await db.doc(`workshops/${f.wid}`).get()).data()).toMatchObject({
      title: 'Sourdough',
      capacity: 12,
      version: 2,
      seatsTaken: 2,
    });
    expect(
      await codeOf(
        adminUpdateWorkshop(
          db,
          admin,
          { workshopId: f.wid, patch: { title: 'x' }, expectedVersion: 1 },
          NOW,
        ),
      ),
    ).toBe('STALE_VERSION');
    expect(
      await codeOf(
        adminUpdateWorkshop(
          db,
          admin,
          { workshopId: f.wid, patch: { capacity: 1 }, expectedVersion: 2 },
          NOW,
        ),
      ),
    ).toBe('CAPACITY_BELOW_BOOKINGS');
    const audits = await db.collection('auditLogs').where('targetId', '==', f.wid).get();
    expect(audits.docs.map((d) => d.data())).toEqual([
      expect.objectContaining({
        action: 'WORKSHOP_ADMIN_EDIT',
        details: { fields: 'title,capacity' },
      }),
    ]);
  });
});

describe('workshops-adminSetStatus (emulator)', () => {
  it('cancel: needs reason + confirmImpact; cancels bookings, keeps attendance, frees slot, notifies', async () => {
    const f = await seedWorkshop('cx1', 3, {
      needsVolunteers: true,
      volunteerSlots: 2,
      volunteersAssigned: 1,
    });
    const a = await seedBooking(f, `sp_c1_${RUN}`, 'CONFIRMED');
    const b = await seedBooking(f, `sp_c2_${RUN}`, 'CONFIRMED');
    const attended = await seedBooking(f, `sp_c3_${RUN}`, 'ATTENDED');
    await db.doc(`volunteerAssignments/${f.wid}_vol`).set({
      id: `${f.wid}_vol`,
      workshopId: f.wid,
      volunteerId: `vol_${RUN}`,
      status: 'ASSIGNED',
    });
    const call = (extra: object) =>
      adminSetStatus(
        db,
        admin,
        {
          workshopId: f.wid,
          status: 'CANCELLED',
          expectedVersion: 1,
          incidentId: 'SA-261019-ABCDE',
          ...extra,
        },
        NOW,
      );

    expect(await codeOf(call({}))).toBe('REASON_REQUIRED');
    expect(await codeOf(call({ reason: 'Storm' }))).toBe('ACTIVE_BOOKINGS_CONFIRM_REQUIRED');
    expect((await db.doc(`workshops/${f.wid}`).get()).data()?.status).toBe('OPEN');

    const res = await call({ reason: 'Storm', confirmImpact: true });
    expect(res).toEqual({ status: 'CANCELLED', version: 2, affectedBookings: 2 });
    expect((await db.doc(`workshops/${f.wid}`).get()).data()).toMatchObject({
      status: 'CANCELLED',
      cancelReason: 'Storm',
      seatsTaken: 1,
    });
    expect((await db.doc(`bookings/${a}`).get()).data()?.status).toBe('CANCELLED');
    expect((await db.doc(`bookings/${b}`).get()).data()?.status).toBe('CANCELLED');
    expect((await db.doc(`bookings/${attended}`).get()).data()?.status).toBe('ATTENDED');
    expect((await db.doc(`attendance/${attended}`).get()).exists).toBe(true);
    expect((await db.doc(`facilities/${f.facility}/slots/${f.slot}`).get()).data()).toMatchObject({
      status: 'AVAILABLE',
      bookedWorkshopId: null,
    });

    const notes = await db
      .collection('notifications')
      .where('refPath', '==', `workshops/${f.wid}`)
      .get();
    expect(notes.docs.map((d) => d.data().userId).sort()).toEqual(
      [`sp_c1_${RUN}`, `sp_c2_${RUN}`, f.instructor, `vol_${RUN}`].sort(),
    );
    expect(notes.docs.every((d) => d.data().type === 'WORKSHOP_CANCELLED')).toBe(true);
    const audit = (await db.collection('auditLogs').where('targetId', '==', f.wid).get()).docs.map(
      (d) => d.data(),
    );
    expect(audit).toEqual([
      expect.objectContaining({
        action: 'WORKSHOP_STATUS_CHANGE',
        details: expect.objectContaining({
          from: 'OPEN',
          to: 'CANCELLED',
          affectedBookings: 2,
          reason: 'Storm',
          incidentId: 'SA-261019-ABCDE',
        }),
      }),
    ]);

    expect(await codeOf(call({ reason: 'again', confirmImpact: true, expectedVersion: 2 }))).toBe(
      'INVALID_TRANSITION',
    );
  });

  it('cancel of a PENDING_VENUE workshop withdraws its venue request', async () => {
    const f = await seedWorkshop('cx2', 3, {
      status: 'PENDING_VENUE',
      activeVenueRequestId: 'vr1',
      slotId: null,
      venue: null,
    });
    await db.doc('venueRequests/vr1').set({ id: 'vr1', workshopId: f.wid, status: 'PENDING' });
    await adminSetStatus(
      db,
      admin,
      { workshopId: f.wid, status: 'CANCELLED', reason: 'Policy', expectedVersion: 1 },
      NOW,
    );
    expect((await db.doc('venueRequests/vr1').get()).data()?.status).toBe('WITHDRAWN');
    expect((await db.doc(`workshops/${f.wid}`).get()).data()).toMatchObject({
      status: 'CANCELLED',
      activeVenueRequestId: null,
    });
  });

  it('archive keeps bookings and attendance; unarchive restores the prior status', async () => {
    const f = await seedWorkshop('ar1', -1);
    const attended = await seedBooking(f, `sp_ar_${RUN}`, 'ATTENDED');
    expect(
      await adminSetStatus(
        db,
        admin,
        { workshopId: f.wid, status: 'COMPLETED', expectedVersion: 1 },
        NOW,
      ),
    ).toMatchObject({ status: 'COMPLETED', version: 2 });
    const arch = await adminSetStatus(
      db,
      admin,
      { workshopId: f.wid, status: 'ARCHIVED', expectedVersion: 2 },
      NOW,
    );
    expect(arch).toEqual({ status: 'ARCHIVED', version: 3, affectedBookings: 0 });
    expect((await db.doc(`workshops/${f.wid}`).get()).data()).toMatchObject({
      status: 'ARCHIVED',
      statusBeforeArchive: 'COMPLETED',
    });
    expect((await db.doc(`bookings/${attended}`).get()).data()?.status).toBe('ATTENDED');
    expect((await db.doc(`attendance/${attended}`).get()).exists).toBe(true);
    await adminSetStatus(
      db,
      admin,
      { workshopId: f.wid, status: 'UNARCHIVE', expectedVersion: 3 },
      NOW,
    );
    const w = (await db.doc(`workshops/${f.wid}`).get()).data();
    expect(w).toMatchObject({ status: 'COMPLETED', version: 4 });
    expect(w).not.toHaveProperty('statusBeforeArchive');
  });

  it('archiving an upcoming OPEN workshop with seats needs confirmImpact and keeps bookings CONFIRMED', async () => {
    const f = await seedWorkshop('ar2', 4);
    const bid = await seedBooking(f, `sp_ar2_${RUN}`, 'CONFIRMED');
    expect(
      await codeOf(
        adminSetStatus(
          db,
          admin,
          { workshopId: f.wid, status: 'ARCHIVED', expectedVersion: 1 },
          NOW,
        ),
      ),
    ).toBe('ACTIVE_BOOKINGS_CONFIRM_REQUIRED');
    await adminSetStatus(
      db,
      admin,
      { workshopId: f.wid, status: 'ARCHIVED', confirmImpact: true, expectedVersion: 1 },
      NOW,
    );
    expect((await db.doc(`bookings/${bid}`).get()).data()?.status).toBe('CONFIRMED');
    expect((await db.doc(`workshops/${f.wid}`).get()).data()?.seatsTaken).toBe(1);
    // L4: the booked learner is told.
    const notes = await db.collection('notifications').where('userId', '==', `sp_ar2_${RUN}`).get();
    expect(notes.docs.map((d) => d.data().title)).toEqual([expect.stringContaining('withdrawn')]);
  });

  it('archive of a PENDING_VENUE workshop withdraws its request; unarchive restores DRAFT (M4)', async () => {
    const f = await seedWorkshop('ar3', 3, {
      status: 'PENDING_VENUE',
      activeVenueRequestId: 'vr-ar3',
      slotId: null,
      venue: null,
    });
    await db
      .doc('venueRequests/vr-ar3')
      .set({ id: 'vr-ar3', workshopId: f.wid, status: 'PENDING' });
    await adminSetStatus(
      db,
      admin,
      { workshopId: f.wid, status: 'ARCHIVED', expectedVersion: 1 },
      NOW,
    );
    expect((await db.doc('venueRequests/vr-ar3').get()).data()?.status).toBe('WITHDRAWN');
    expect((await db.doc(`workshops/${f.wid}`).get()).data()).toMatchObject({
      status: 'ARCHIVED',
      activeVenueRequestId: null,
      statusBeforeArchive: 'DRAFT',
    });
    await adminSetStatus(
      db,
      admin,
      { workshopId: f.wid, status: 'UNARCHIVE', expectedVersion: 2 },
      NOW,
    );
    expect((await db.doc(`workshops/${f.wid}`).get()).data()?.status).toBe('DRAFT');
  });

  it('concurrent cancels: one wins, the other is STALE_VERSION', async () => {
    const f = await seedWorkshop('cx3', 3);
    await seedBooking(f, `sp_cc_${RUN}`, 'CONFIRMED');
    const go = () =>
      codeOf(
        adminSetStatus(
          db,
          admin,
          {
            workshopId: f.wid,
            status: 'CANCELLED',
            reason: 'r',
            confirmImpact: true,
            expectedVersion: 1,
          },
          NOW,
        ),
      );
    const results = await Promise.all([go(), go()]);
    expect(results.filter((c) => c === undefined)).toHaveLength(1);
    expect(results.filter((c) => c === 'STALE_VERSION' || c === 'INVALID_TRANSITION')).toHaveLength(
      1,
    );
    const notes = await db
      .collection('notifications')
      .where('refPath', '==', `workshops/${f.wid}`)
      .get();
    expect(notes.size).toBe(2);
  });
});
