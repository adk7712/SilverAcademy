// Emulator integration test: workshop create/update and volunteer opt-in duplicate prevention (UC #1-2, #3-2).
import { getApps, initializeApp } from 'firebase-admin/app';
import { Timestamp, getFirestore } from 'firebase-admin/firestore';
import type { Caller } from '../common';
import { createWorkshop } from './handlers/createWorkshop';
import { optInVolunteer } from './handlers/optInVolunteer';
import { updateWorkshop } from './handlers/updateWorkshop';
import { withdrawVolunteer } from './handlers/withdrawVolunteer';

if (getApps().length === 0) initializeApp({ projectId: process.env.GCLOUD_PROJECT });
const db = getFirestore();
const NOW = new Date('2026-10-19T04:00:00Z');
const base = { db, now: NOW };

let n = 0;
const uniq = (p: string) => `${p}${++n}`;
const callerOf = (uid: string, role: 'SENIOR_INSTRUCTOR' | 'VOLUNTEER'): Caller => ({
  uid,
  roles: [role],
  user: { uid, displayName: `Name ${uid}`, roles: [role], status: 'ACTIVE' } as Caller['user'],
});
const get = async (path: string) => (await db.doc(path).get()).data();
const code = (p: Promise<unknown>) =>
  p.then(
    () => 'OK',
    (e: { code?: string }) => e.code,
  );

async function seedOpenWorkshop(volunteerSlots: number, startIso = '2026-10-25T02:00:00Z') {
  const workshopId = uniq('ws');
  await db.doc(`workshops/${workshopId}`).set({
    id: workshopId,
    instructorId: 'inst',
    title: 'Tai chi',
    status: 'OPEN',
    needsVolunteers: true,
    volunteerSlots,
    volunteersAssigned: 0,
    startAt: Timestamp.fromDate(new Date(startIso)),
    version: 1,
  });
  return workshopId;
}

describe('workshops-createWorkshop / updateWorkshop (emulator)', () => {
  const input = {
    title: 'Phone',
    description: 'd',
    category: 'DIGITAL_SKILLS' as const,
    capacity: 8,
    materials: '',
    needsVolunteers: true,
    volunteerSlots: 2,
  };

  it('needs an APPROVED profile; creates a DRAFT; owner edits DRAFT only', async () => {
    const uid = uniq('si');
    const caller = callerOf(uid, 'SENIOR_INSTRUCTOR');
    expect(await code(createWorkshop({ ...base, caller, input }))).toBe('PROFILE_NOT_APPROVED');
    await db.doc(`instructorProfiles/${uid}`).set({ uid, status: 'APPROVED' });
    const res = await createWorkshop({ ...base, caller, input });
    expect(res.status).toBe('DRAFT');
    expect(await get(`workshops/${res.workshopId}`)).toMatchObject({
      instructorId: uid,
      instructorName: `Name ${uid}`,
      status: 'DRAFT',
      seatsTaken: 0,
      volunteersAssigned: 0,
      activeVenueRequestId: null,
      venue: null,
      startAt: null,
      version: 1,
      volunteerSlots: 2,
    });

    await updateWorkshop({
      ...base,
      caller,
      input: { workshopId: res.workshopId, patch: { title: 'Phone 2', capacity: 12 } },
    });
    expect(await get(`workshops/${res.workshopId}`)).toMatchObject({
      title: 'Phone 2',
      capacity: 12,
      version: 2,
    });
    expect(
      await code(
        updateWorkshop({
          ...base,
          caller: callerOf('x', 'SENIOR_INSTRUCTOR'),
          input: { workshopId: res.workshopId, patch: {} },
        }),
      ),
    ).toBe('PERMISSION_DENIED');
    await db.doc(`workshops/${res.workshopId}`).update({ status: 'PENDING_VENUE' });
    expect(
      await code(
        updateWorkshop({
          ...base,
          caller,
          input: { workshopId: res.workshopId, patch: { title: 'x' } },
        }),
      ),
    ).toBe('WORKSHOP_NOT_EDITABLE');
  });
});

describe('workshops-optInVolunteer (emulator)', () => {
  it('same volunteer opting in 5x in parallel: exactly one ASSIGNED, the rest ALREADY_OPTED_IN, counter 1', async () => {
    const workshopId = await seedOpenWorkshop(3);
    const caller = callerOf(uniq('vol'), 'VOLUNTEER');
    const results = await Promise.all(
      Array.from({ length: 5 }, () =>
        code(optInVolunteer({ ...base, caller, input: { workshopId } })),
      ),
    );
    expect(results.filter((r) => r === 'OK')).toHaveLength(1);
    expect(results.filter((r) => r === 'ALREADY_OPTED_IN')).toHaveLength(4);
    expect(await get(`workshops/${workshopId}`)).toMatchObject({ volunteersAssigned: 1 });
    expect(await get(`volunteerAssignments/${workshopId}_${caller.uid}`)).toMatchObject({
      status: 'ASSIGNED',
      volunteerId: caller.uid,
      workshopTitle: 'Tai chi',
    });
  });

  it('3 volunteers racing for 2 slots: 2 ASSIGNED, 1 VOLUNTEERS_FULL', async () => {
    const workshopId = await seedOpenWorkshop(2);
    const callers = [1, 2, 3].map(() => callerOf(uniq('vol'), 'VOLUNTEER'));
    const results = await Promise.all(
      callers.map((caller) => code(optInVolunteer({ ...base, caller, input: { workshopId } }))),
    );
    expect(results.filter((r) => r === 'OK')).toHaveLength(2);
    expect(results.filter((r) => r === 'VOLUNTEERS_FULL')).toHaveLength(1);
    expect(await get(`workshops/${workshopId}`)).toMatchObject({ volunteersAssigned: 2 });
  });

  it('withdraw frees the slot, allows opting in again, and is refused after start', async () => {
    const workshopId = await seedOpenWorkshop(1);
    const v = callerOf(uniq('vol'), 'VOLUNTEER');
    await optInVolunteer({ ...base, caller: v, input: { workshopId } });
    expect(
      await code(
        optInVolunteer({
          ...base,
          caller: callerOf(uniq('vol'), 'VOLUNTEER'),
          input: { workshopId },
        }),
      ),
    ).toBe('VOLUNTEERS_FULL');
    expect(await withdrawVolunteer({ ...base, caller: v, input: { workshopId } })).toEqual({
      status: 'WITHDRAWN',
    });
    expect(await get(`workshops/${workshopId}`)).toMatchObject({ volunteersAssigned: 0 });
    expect(await code(withdrawVolunteer({ ...base, caller: v, input: { workshopId } }))).toBe(
      'NOT_ASSIGNED',
    );
    expect(await code(optInVolunteer({ ...base, caller: v, input: { workshopId } }))).toBe('OK');
    expect(await get(`workshops/${workshopId}`)).toMatchObject({ volunteersAssigned: 1 });

    const lateNow = { ...base, now: new Date('2026-10-25T03:00:00Z') };
    expect(await code(withdrawVolunteer({ ...lateNow, caller: v, input: { workshopId } }))).toBe(
      'WORKSHOP_STARTED',
    );
  });

  it('refuses workshops that are not open for volunteers', async () => {
    const draft = uniq('ws');
    await db.doc(`workshops/${draft}`).set({
      id: draft,
      status: 'DRAFT',
      needsVolunteers: true,
      volunteerSlots: 1,
      volunteersAssigned: 0,
      startAt: null,
    });
    const v = callerOf(uniq('vol'), 'VOLUNTEER');
    expect(await code(optInVolunteer({ ...base, caller: v, input: { workshopId: draft } }))).toBe(
      'NOT_ACCEPTING_VOLUNTEERS',
    );
    expect(await code(optInVolunteer({ ...base, caller: v, input: { workshopId: 'nope' } }))).toBe(
      'NOT_FOUND',
    );
  });
});
