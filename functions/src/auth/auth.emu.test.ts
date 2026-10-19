// Emulator integration test for the auth handlers (UC #0-1, #0-2). Run via `npm run test:emulator`.
import { getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { exchangeSingpass } from './handlers/exchangeSingpass';
import { recordStaffLogin, STAFF_REPORT_LIMITS } from './handlers/recordStaffLogin';
import { syncClaimsFromUserDoc } from './repo/claimsRepo';
import { MockSingpassVerifier } from './singpassVerifier';
import { singpassUid } from './controller/singpassLogin';

if (getApps().length === 0) initializeApp({ projectId: process.env.GCLOUD_PROJECT });
const db = getFirestore();
const auth = getAuth();
const verifier = new MockSingpassVerifier();
const NOW = new Date('2026-10-19T04:00:00Z');

const exchange = (profileId: string, registerAs?: 'LEARNER' | 'VOLUNTEER') =>
  exchangeSingpass(
    {
      input: { assertion: `mock:${profileId}`, ...(registerAs ? { registerAs } : {}) },
      db,
      now: NOW,
    },
    verifier,
    auth,
  );

const uidOf = (sub: string) => singpassUid(sub);

describe('auth-exchangeSingpass (emulator)', () => {
  it('first login: REGISTRATION_REQUIRED, then registers a 62-year-old as LEARNER + SENIOR_INSTRUCTOR with claims', async () => {
    await expect(exchange('senior-62')).rejects.toMatchObject({ code: 'REGISTRATION_REQUIRED' });
    expect((await db.doc(`users/${uidOf('S-MOCK-SENIOR-62')}`).get()).exists).toBe(false);

    const res = await exchange('senior-62', 'LEARNER');
    expect(res).toMatchObject({
      isNewUser: true,
      seniorEligible: true,
      roles: ['LEARNER', 'SENIOR_INSTRUCTOR'],
    });
    expect(res.customToken.length).toBeGreaterThan(20);

    const user = (await db.doc(`users/${res.uid}`).get()).data();
    expect(user).toMatchObject({
      uid: res.uid,
      authType: 'SINGPASS',
      status: 'ACTIVE',
      flagged: false,
      version: 1,
      roles: ['LEARNER', 'SENIOR_INSTRUCTOR'],
      prefs: { fontScale: 1 },
    });
    expect(user).not.toHaveProperty('dateOfBirth');
    expect((await auth.getUser(res.uid)).customClaims).toEqual({
      roles: ['LEARNER', 'SENIOR_INSTRUCTOR'],
      status: 'ACTIVE',
    });
  });

  it('repeat login: not new, version unchanged (L1), registerAs ignored, no duplicate roles', async () => {
    const first = await exchange('learner-35', 'LEARNER');
    const second = await exchange('learner-35', 'VOLUNTEER');
    expect(first.isNewUser).toBe(true);
    expect(second).toMatchObject({ isNewUser: false, roles: ['LEARNER'], uid: first.uid });
    expect((await db.doc(`users/${first.uid}`).get()).data()?.version).toBe(1);
  });

  it('volunteer registration', async () => {
    const res = await exchange('volunteer-28', 'VOLUNTEER');
    expect(res.roles).toEqual(['VOLUNTEER']);
  });

  it('suspended account is refused', async () => {
    const res = await exchange('senior-72', 'LEARNER');
    await db.doc(`users/${res.uid}`).update({ status: 'SUSPENDED' });
    await expect(exchange('senior-72')).rejects.toMatchObject({ code: 'ACCOUNT_SUSPENDED' });
  });

  it('IdP exceptions surface and create nothing', async () => {
    await expect(exchange('FAIL', 'LEARNER')).rejects.toMatchObject({
      code: 'SINGPASS_AUTH_FAILED',
    });
    await expect(exchange('DOWN', 'LEARNER')).rejects.toMatchObject({
      code: 'SINGPASS_UNAVAILABLE',
    });
  });
});

describe('auth-recordStaffLogin (emulator)', () => {
  const ctx = (userId: string, outcome: 'SUCCESS' | 'FAILURE' | 'BLOCKED', uid?: string) => ({
    input: { userId, outcome },
    db,
    uid,
    now: new Date(),
  });
  const auditFor = async (userId: string) =>
    (await db.collection('auditLogs').where('details.userId', '==', userId).get()).docs.map((d) =>
      d.data(),
    );

  beforeAll(async () => {
    await auth.createUser({
      uid: 'st_adminX',
      email: 'adminX@staff.silveracademy.test',
      password: 'password123',
    });
    await db.doc('users/st_adminX').set({
      uid: 'st_adminX',
      authType: 'STAFF',
      staffUserId: 'adminX',
      roles: ['ADMIN'],
      status: 'ACTIVE',
      displayName: 'Admin X',
    });
    await db.doc('users/sp_learnerY').set({
      uid: 'sp_learnerY',
      authType: 'SINGPASS',
      roles: ['LEARNER'],
      status: 'ACTIVE',
      displayName: 'L',
    });
  });

  it('FAILURE and BLOCKED work unauthenticated and are audited with a null actor', async () => {
    await expect(recordStaffLogin(ctx('ghost', 'FAILURE'), auth)).resolves.toEqual({});
    await expect(recordStaffLogin(ctx('ghost', 'BLOCKED'), auth)).resolves.toEqual({});
    const logs = await auditFor('ghost');
    expect(logs.map((l) => l.outcome).sort()).toEqual(['DENIED', 'FAILURE']);
    for (const l of logs)
      expect(l).toMatchObject({ actorId: null, actorRole: null, action: 'STAFF_LOGIN' });
  });

  it('SUCCESS audits, returns roles and syncs claims (incl. status)', async () => {
    await expect(recordStaffLogin(ctx('adminX', 'SUCCESS', 'st_adminX'), auth)).resolves.toEqual({
      roles: ['ADMIN'],
    });
    expect((await auth.getUser('st_adminX')).customClaims).toEqual({
      roles: ['ADMIN'],
      status: 'ACTIVE',
    });
    expect(
      (await auditFor('adminX')).some((l) => l.outcome === 'SUCCESS' && l.actorId === 'st_adminX'),
    ).toBe(true);
  });

  it('SUCCESS needs auth; wrong account type or id mismatch -> NOT_STAFF_ACCOUNT and a DENIED audit', async () => {
    await expect(recordStaffLogin(ctx('adminX', 'SUCCESS'), auth)).rejects.toMatchObject({
      code: 'UNAUTHENTICATED',
    });
    await expect(
      recordStaffLogin(ctx('adminX', 'SUCCESS', 'sp_learnerY'), auth),
    ).rejects.toMatchObject({ code: 'NOT_STAFF_ACCOUNT' });
    await expect(
      recordStaffLogin(ctx('other', 'SUCCESS', 'st_adminX'), auth),
    ).rejects.toMatchObject({ code: 'NOT_STAFF_ACCOUNT' });
    expect(
      (await auditFor('adminX')).some(
        (l) => l.outcome === 'DENIED' && l.details.code === 'NOT_STAFF_ACCOUNT',
      ),
    ).toBe(true);
  });

  it('unauthenticated floods are capped per staff id and for unknown ids (M3)', async () => {
    for (let i = 0; i < STAFF_REPORT_LIMITS.perStaffId + 5; i += 1) {
      await recordStaffLogin(ctx('adminX', 'FAILURE'), auth);
    }
    const failures = (await auditFor('adminX')).filter(
      (l) => l.outcome === 'FAILURE' && l.details.clientReported === true,
    );
    expect(failures).toHaveLength(STAFF_REPORT_LIMITS.perStaffId);
    expect(failures[0]?.details.knownStaffId).toBe(true);
    for (let i = 0; i < STAFF_REPORT_LIMITS.unknownIds + 5; i += 1) {
      await recordStaffLogin(ctx(`nobody${i}`, 'FAILURE'), auth);
    }
    const unknown = await db
      .collection('auditLogs')
      .where('details.knownStaffId', '==', false)
      .where('outcome', '==', 'FAILURE')
      .get();
    expect(unknown.size).toBeLessThanOrEqual(STAFF_REPORT_LIMITS.unknownIds + 2); // + 'ghost' from the first test
  });

  it('user id is case-insensitive on SUCCESS (L2)', async () => {
    await expect(recordStaffLogin(ctx('adminx', 'SUCCESS', 'st_adminX'), auth)).resolves.toEqual({
      roles: ['ADMIN'],
    });
  });
});

describe('claims follow the Firestore status (M2)', () => {
  it('syncClaimsFromUserDoc writes SUSPENDED, never a literal ACTIVE', async () => {
    const uid = 'sp_raceZ';
    await db.doc(`users/${uid}`).set({
      uid,
      authType: 'SINGPASS',
      roles: ['LEARNER'],
      status: 'SUSPENDED',
      displayName: 'Z',
    });
    const claims = await syncClaimsFromUserDoc(db, auth, uid, ['LEARNER'], 'Z');
    expect(claims).toEqual({ roles: ['LEARNER'], status: 'SUSPENDED' });
    expect((await auth.getUser(uid)).customClaims).toEqual(claims);
  });
});
