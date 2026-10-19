// Emulator integration test: venue approval slot locking and conflicts (UC #1-3, #4-1, #4-2). Run via `npm run test:emulator`.
import { getApps, initializeApp } from 'firebase-admin/app';
import { Timestamp, getFirestore } from 'firebase-admin/firestore';
import type { Caller } from '../common';
import { decideVenueRequest } from './handlers/decideVenueRequest';
import { deleteSlot } from './handlers/deleteSlot';
import { requestVenue } from './handlers/requestVenue';
import { respondToInfoRequest } from './handlers/respondToInfoRequest';
import { upsertFacility } from './handlers/upsertFacility';
import { upsertSlot } from './handlers/upsertSlot';
import { withdrawVenueRequest } from './handlers/withdrawVenueRequest';

if (getApps().length === 0) initializeApp({ projectId: process.env.GCLOUD_PROJECT });
const db = getFirestore();
const NOW = new Date('2026-10-19T04:00:00Z');
const START = '2026-10-25T02:00:00Z';
const END = '2026-10-25T04:00:00Z';

const callerOf = (uid: string, role: 'SENIOR_INSTRUCTOR' | 'COMMUNITY_PARTNER'): Caller => ({
  uid,
  roles: [role],
  user: {
    uid,
    displayName: `Name ${uid}`,
    orgName: 'Org',
    roles: [role],
    status: 'ACTIVE',
  } as Caller['user'],
});
const cp = (uid: string) => callerOf(uid, 'COMMUNITY_PARTNER');
const si = (uid: string) => callerOf(uid, 'SENIOR_INSTRUCTOR');
const base = { db, now: NOW };

let n = 0;
const uniq = (p: string) => `${p}${++n}`;

async function seedWorld(opts: { siCount?: number; capacity?: number } = {}) {
  const partner = uniq('cp');
  const facilityId = uniq('fac');
  const slotId = uniq('slot');
  await db.doc(`facilities/${facilityId}`).set({
    id: facilityId,
    partnerId: partner,
    orgName: 'Org',
    name: 'Hall',
    address: 'A',
    postalCode: '123456',
    lat: 1.3,
    lng: 103.8,
    capacity: opts.capacity ?? 30,
    amenities: [],
  });
  await db.doc(`facilities/${facilityId}/slots/${slotId}`).set({
    id: slotId,
    facilityId,
    partnerId: partner,
    startAt: Timestamp.fromDate(new Date(START)),
    endAt: Timestamp.fromDate(new Date(END)),
    status: 'AVAILABLE',
    bookedWorkshopId: null,
    bookedRequestId: null,
  });
  const instructors: { uid: string; workshopId: string }[] = [];
  for (let i = 0; i < (opts.siCount ?? 2); i++) {
    const uid = uniq('si');
    const workshopId = uniq('ws');
    await db.doc(`instructorProfiles/${uid}`).set({ uid, status: 'APPROVED' });
    await db.doc(`workshops/${workshopId}`).set({
      id: workshopId,
      instructorId: uid,
      instructorName: `Name ${uid}`,
      title: `W ${i}`,
      description: 'd',
      category: 'MUSIC',
      capacity: 10,
      materials: '',
      status: 'DRAFT',
      seatsTaken: 0,
      attendedCount: 0,
      needsVolunteers: false,
      volunteerSlots: 0,
      volunteersAssigned: 0,
      activeVenueRequestId: null,
      slotId: null,
      startAt: null,
      endAt: null,
      venue: null,
      ratingSum: 0,
      ratingCount: 0,
      version: 1,
    });
    instructors.push({ uid, workshopId });
  }
  return { partner, facilityId, slotId, instructors };
}

async function requestAll(w: Awaited<ReturnType<typeof seedWorld>>) {
  const out: { requestId: string; uid: string; workshopId: string }[] = [];
  for (const i of w.instructors) {
    const { requestId } = await requestVenue({
      ...base,
      caller: si(i.uid),
      input: { workshopId: i.workshopId, facilityId: w.facilityId, slotId: w.slotId },
    });
    out.push({ requestId, ...i });
  }
  return out;
}

const get = async (path: string) => (await db.doc(path).get()).data();
const code = (p: Promise<unknown>) =>
  p.then(
    () => 'OK',
    (e: { code?: string }) => e.code,
  );

describe('venues-requestVenue (emulator)', () => {
  it('creates a PENDING request, moves the workshop to PENDING_VENUE and notifies the partner', async () => {
    const w = await seedWorld({ siCount: 1 });
    const [r] = await requestAll(w);
    expect(await get(`venueRequests/${r!.requestId}`)).toMatchObject({
      status: 'PENDING',
      partnerId: w.partner,
      slotId: w.slotId,
      facilityName: 'Hall',
    });
    expect(await get(`workshops/${r!.workshopId}`)).toMatchObject({
      status: 'PENDING_VENUE',
      activeVenueRequestId: r!.requestId,
      version: 2,
    });
    const notes = await db.collection('notifications').where('userId', '==', w.partner).get();
    expect(notes.docs.map((d) => d.data().type)).toContain('VENUE_REQUEST_NEW');
  });

  it('refuses a second request for the same workshop and a too-small venue', async () => {
    const w = await seedWorld({ siCount: 1 });
    const [r] = await requestAll(w);
    const again = { workshopId: r!.workshopId, facilityId: w.facilityId, slotId: w.slotId };
    expect(await code(requestVenue({ ...base, caller: si(r!.uid), input: again }))).toBe(
      'VENUE_REQUEST_EXISTS',
    );
    const small = await seedWorld({ siCount: 1, capacity: 2 });
    const i = small.instructors[0]!;
    expect(
      await code(
        requestVenue({
          ...base,
          caller: si(i.uid),
          input: { workshopId: i.workshopId, facilityId: small.facilityId, slotId: small.slotId },
        }),
      ),
    ).toBe('VENUE_TOO_SMALL');
  });

  it('withdraw returns the workshop to DRAFT', async () => {
    const w = await seedWorld({ siCount: 1 });
    const [r] = await requestAll(w);
    await withdrawVenueRequest({ ...base, caller: si(r!.uid), input: { requestId: r!.requestId } });
    expect(await get(`venueRequests/${r!.requestId}`)).toMatchObject({ status: 'WITHDRAWN' });
    expect(await get(`workshops/${r!.workshopId}`)).toMatchObject({
      status: 'DRAFT',
      activeVenueRequestId: null,
    });
  });
});

describe('archived workshops stay archived (M4)', () => {
  it('withdraw and reject do not un-archive a workshop', async () => {
    const w = await seedWorld({ siCount: 2 });
    const [a, b] = await requestAll(w);
    for (const r of [a!, b!])
      await db.doc(`workshops/${r.workshopId}`).update({ status: 'ARCHIVED' });
    await withdrawVenueRequest({ ...base, caller: si(a!.uid), input: { requestId: a!.requestId } });
    await decideVenueRequest({
      ...base,
      caller: cp(w.partner),
      input: { requestId: b!.requestId, decision: 'REJECT' },
    });
    expect(await get(`venueRequests/${a!.requestId}`)).toMatchObject({ status: 'WITHDRAWN' });
    expect(await get(`venueRequests/${b!.requestId}`)).toMatchObject({ status: 'REJECTED' });
    expect(await get(`workshops/${a!.workshopId}`)).toMatchObject({ status: 'ARCHIVED' });
    expect(await get(`workshops/${b!.workshopId}`)).toMatchObject({ status: 'ARCHIVED' });
  });
});

describe('venues-decideVenueRequest late approval (L3, emulator)', () => {
  it('APPROVE after the slot start commits CONFLICTED and resets the workshop', async () => {
    const w = await seedWorld({ siCount: 1 });
    const [a] = await requestAll(w);
    await expect(
      decideVenueRequest({
        db,
        now: new Date('2026-10-26T00:00:00Z'),
        caller: cp(w.partner),
        input: { requestId: a!.requestId, decision: 'APPROVE' },
      }),
    ).rejects.toMatchObject({ code: 'SLOT_CONFLICT' });
    expect(await get(`venueRequests/${a!.requestId}`)).toMatchObject({ status: 'CONFLICTED' });
    expect(await get(`workshops/${a!.workshopId}`)).toMatchObject({ status: 'DRAFT' });
    expect(await get(`facilities/${w.facilityId}/slots/${w.slotId}`)).toMatchObject({
      status: 'AVAILABLE',
    });
  });
});

describe('venues-decideVenueRequest (emulator)', () => {
  it('APPROVE: books the slot, opens the workshop, conflicts competitors, notifies, all together', async () => {
    const w = await seedWorld({ siCount: 3 });
    const [a, b, c] = await requestAll(w);
    const res = await decideVenueRequest({
      ...base,
      caller: cp(w.partner),
      input: { requestId: a!.requestId, decision: 'APPROVE' },
    });
    expect(res).toMatchObject({ status: 'APPROVED', workshopId: a!.workshopId });
    expect(res.conflictedRequestIds.sort()).toEqual([b!.requestId, c!.requestId].sort());

    expect(await get(`facilities/${w.facilityId}/slots/${w.slotId}`)).toMatchObject({
      status: 'BOOKED',
      bookedWorkshopId: a!.workshopId,
      bookedRequestId: a!.requestId,
    });
    expect(await get(`workshops/${a!.workshopId}`)).toMatchObject({
      status: 'OPEN',
      slotId: w.slotId,
      activeVenueRequestId: null,
      venue: { facilityId: w.facilityId, name: 'Hall', partnerId: w.partner },
    });
    expect((await get(`workshops/${a!.workshopId}`))?.startAt.toDate()).toEqual(new Date(START));
    expect(await get(`venueRequests/${a!.requestId}`)).toMatchObject({
      status: 'APPROVED',
      decidedBy: w.partner,
    });
    for (const x of [b!, c!]) {
      expect(await get(`venueRequests/${x.requestId}`)).toMatchObject({ status: 'CONFLICTED' });
      expect(await get(`workshops/${x.workshopId}`)).toMatchObject({
        status: 'DRAFT',
        activeVenueRequestId: null,
      });
      const notes = await db.collection('notifications').where('userId', '==', x.uid).get();
      expect(notes.docs.map((d) => d.data().type)).toContain('VENUE_REQUEST_CONFLICTED');
    }
    const winner = await db.collection('notifications').where('userId', '==', a!.uid).get();
    expect(winner.docs.map((d) => d.data().type)).toContain('VENUE_REQUEST_DECIDED');
  });

  it('two approvals racing for one slot: exactly one wins, the other commits CONFLICTED and throws SLOT_CONFLICT', async () => {
    const w = await seedWorld({ siCount: 2 });
    const [a, b] = await requestAll(w);
    const results = await Promise.allSettled(
      [a!, b!].map((r) =>
        decideVenueRequest({
          ...base,
          caller: cp(w.partner),
          input: { requestId: r.requestId, decision: 'APPROVE' },
        }),
      ),
    );
    const ok = results.filter((r) => r.status === 'fulfilled');
    const failed = results.filter((r): r is PromiseRejectedResult => r.status === 'rejected');
    expect(ok).toHaveLength(1);
    expect(failed).toHaveLength(1);
    expect(failed[0]!.reason).toMatchObject({ code: 'SLOT_CONFLICT' });

    const statuses = await Promise.all(
      [a!, b!].map(async (r) => (await get(`venueRequests/${r.requestId}`))?.status),
    );
    expect([...statuses].sort()).toEqual(['APPROVED', 'CONFLICTED']);
    const workshops = await Promise.all(
      [a!, b!].map(async (r) => (await get(`workshops/${r.workshopId}`))?.status),
    );
    expect(workshops.sort()).toEqual(['DRAFT', 'OPEN']);
    const slot = await get(`facilities/${w.facilityId}/slots/${w.slotId}`);
    expect(slot?.status).toBe('BOOKED');
    const winner = statuses[0] === 'APPROVED' ? a! : b!;
    expect(slot?.bookedRequestId).toBe(winner.requestId);
  });

  it('SLOT_CONFLICT details carry requestId; approving an already-conflicted request is SLOT_CONFLICT again', async () => {
    const w = await seedWorld({ siCount: 2 });
    const [a, b] = await requestAll(w);
    await decideVenueRequest({
      ...base,
      caller: cp(w.partner),
      input: { requestId: a!.requestId, decision: 'APPROVE' },
    });
    expect(
      await code(
        decideVenueRequest({
          ...base,
          caller: cp(w.partner),
          input: { requestId: b!.requestId, decision: 'APPROVE' },
        }),
      ),
    ).toBe('SLOT_CONFLICT');
  });

  it('REJECT with and without reason returns the workshop to DRAFT and leaves the slot AVAILABLE', async () => {
    const w = await seedWorld({ siCount: 2 });
    const [a, b] = await requestAll(w);
    await decideVenueRequest({
      ...base,
      caller: cp(w.partner),
      input: { requestId: a!.requestId, decision: 'REJECT' },
    });
    await decideVenueRequest({
      ...base,
      caller: cp(w.partner),
      input: { requestId: b!.requestId, decision: 'REJECT', reason: 'Closed that day' },
    });
    const ra = await get(`venueRequests/${a!.requestId}`);
    expect(ra).toMatchObject({ status: 'REJECTED' });
    expect(ra).not.toHaveProperty('decisionReason');
    expect(await get(`venueRequests/${b!.requestId}`)).toMatchObject({
      status: 'REJECTED',
      decisionReason: 'Closed that day',
    });
    expect(await get(`workshops/${a!.workshopId}`)).toMatchObject({
      status: 'DRAFT',
      activeVenueRequestId: null,
    });
    expect(await get(`facilities/${w.facilityId}/slots/${w.slotId}`)).toMatchObject({
      status: 'AVAILABLE',
    });
  });

  it('REQUEST_INFO needs a message; the instructor reply sets the request back to PENDING', async () => {
    const w = await seedWorld({ siCount: 1 });
    const [a] = await requestAll(w);
    const id = a!.requestId;
    expect(
      await code(
        decideVenueRequest({
          ...base,
          caller: cp(w.partner),
          input: { requestId: id, decision: 'REQUEST_INFO' },
        }),
      ),
    ).toBe('REASON_REQUIRED');
    await decideVenueRequest({
      ...base,
      caller: cp(w.partner),
      input: { requestId: id, decision: 'REQUEST_INFO', message: 'Need a ramp?' },
    });
    expect(await get(`venueRequests/${id}`)).toMatchObject({
      status: 'AWAITING_INFO',
      infoRequest: 'Need a ramp?',
    });
    await respondToInfoRequest({
      ...base,
      caller: si(a!.uid),
      input: { requestId: id, message: 'No ramp needed' },
    });
    expect(await get(`venueRequests/${id}`)).toMatchObject({
      status: 'PENDING',
      infoResponse: 'No ramp needed',
    });
  });

  it('only the owning partner may decide', async () => {
    const w = await seedWorld({ siCount: 1 });
    const [a] = await requestAll(w);
    expect(
      await code(
        decideVenueRequest({
          ...base,
          caller: cp('someone-else'),
          input: { requestId: a!.requestId, decision: 'APPROVE' },
        }),
      ),
    ).toBe('NOT_FACILITY_OWNER');
  });
});

describe('slot management (emulator)', () => {
  it('a BOOKED slot cannot be edited or deleted', async () => {
    const w = await seedWorld({ siCount: 1 });
    const [a] = await requestAll(w);
    await decideVenueRequest({
      ...base,
      caller: cp(w.partner),
      input: { requestId: a!.requestId, decision: 'APPROVE' },
    });
    const edit = {
      facilityId: w.facilityId,
      slotId: w.slotId,
      startAt: START,
      endAt: END,
      status: 'UNAVAILABLE' as const,
    };
    expect(await code(upsertSlot({ ...base, caller: cp(w.partner), input: edit }))).toBe(
      'SLOT_BOOKED_LOCKED',
    );
    expect(
      await code(
        deleteSlot({
          ...base,
          caller: cp(w.partner),
          input: { facilityId: w.facilityId, slotId: w.slotId },
        }),
      ),
    ).toBe('SLOT_BOOKED_LOCKED');
    expect(await get(`facilities/${w.facilityId}/slots/${w.slotId}`)).toMatchObject({
      status: 'BOOKED',
    });
  });

  it('making a slot unavailable conflicts its pending requests; deleting does too', async () => {
    const w = await seedWorld({ siCount: 2 });
    const [a, b] = await requestAll(w);
    const res = await upsertSlot({
      ...base,
      caller: cp(w.partner),
      input: {
        facilityId: w.facilityId,
        slotId: w.slotId,
        startAt: START,
        endAt: END,
        status: 'MAINTENANCE',
      },
    });
    expect(res.conflictedRequestIds.sort()).toEqual([a!.requestId, b!.requestId].sort());
    expect(await get(`workshops/${a!.workshopId}`)).toMatchObject({
      status: 'DRAFT',
      activeVenueRequestId: null,
    });

    const w2 = await seedWorld({ siCount: 1 });
    const [c] = await requestAll(w2);
    const del = await deleteSlot({
      ...base,
      caller: cp(w2.partner),
      input: { facilityId: w2.facilityId, slotId: w2.slotId },
    });
    expect(del.conflictedRequestIds).toEqual([c!.requestId]);
    expect((await db.doc(`facilities/${w2.facilityId}/slots/${w2.slotId}`).get()).exists).toBe(
      false,
    );
  });

  it('creates facility and slots, rejects overlaps, foreign facilities and out-of-bounds locations', async () => {
    const partner = uniq('cp');
    const fac = {
      name: 'New',
      address: 'A',
      postalCode: '123456',
      lat: 1.3,
      lng: 103.8,
      capacity: 20,
      amenities: ['Wi-Fi'],
    };
    const { facilityId } = await upsertFacility({ ...base, caller: cp(partner), input: fac });
    expect(await get(`facilities/${facilityId}`)).toMatchObject({
      partnerId: partner,
      orgName: 'Org',
      name: 'New',
    });
    expect(
      await code(upsertFacility({ ...base, caller: cp('other'), input: { ...fac, facilityId } })),
    ).toBe('NOT_FACILITY_OWNER');
    expect(
      await code(
        upsertFacility({ ...base, caller: cp(partner), input: { ...fac, lat: 40, lng: 0 } }),
      ),
    ).toBe('LOCATION_OUT_OF_BOUNDS');

    const slot = { facilityId, startAt: START, endAt: END, status: 'AVAILABLE' as const };
    const { slotId } = await upsertSlot({ ...base, caller: cp(partner), input: slot });
    expect(await get(`facilities/${facilityId}/slots/${slotId}`)).toMatchObject({
      status: 'AVAILABLE',
      partnerId: partner,
      bookedWorkshopId: null,
    });
    expect(
      await code(
        upsertSlot({
          ...base,
          caller: cp(partner),
          input: { ...slot, startAt: '2026-10-25T03:00:00Z', endAt: '2026-10-25T05:00:00Z' },
        }),
      ),
    ).toBe('SLOT_OVERLAP');
    expect(
      await code(
        upsertSlot({
          ...base,
          caller: cp(partner),
          input: { ...slot, startAt: END, endAt: '2026-10-25T06:00:00Z' },
        }),
      ),
    ).toBe('OK');
  });
});
