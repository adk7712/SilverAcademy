// Emulator integration test for the users handlers (UC #5-1 suspend flow, #5-5, gap #17). Run via `npm run test:emulator`.
import { getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { requireCaller } from '../common';
import { setAccountStatus } from './repo/accountRepo';
import { reviewInstructorProfile, submitInstructorProfile } from './repo/instructorProfileRepo';
import { createStaffAccount } from './repo/staffAccountRepo';
import { markNotificationRead, updatePreferences } from './repo/userSelfRepo';
import type { Role, User } from '@silveracademy/shared';

if (getApps().length === 0) initializeApp({ projectId: process.env.GCLOUD_PROJECT });
const db = getFirestore();
const auth = getAuth();
const RUN = Date.now().toString(36);

const ADMIN = { uid: `st_admin_${RUN}`, roles: ['ADMIN'] as Role[] };
const codeOf = async (p: Promise<unknown>): Promise<string | undefined> => {
  try {
    await p;
  } catch (e) {
    return (e as { code?: string }).code;
  }
};

async function seedUser(uid: string, roles: Role[], extra: Partial<User> = {}): Promise<void> {
  await auth.createUser({ uid, displayName: uid });
  await auth.setCustomUserClaims(uid, { roles, status: 'ACTIVE' });
  await db.doc(`users/${uid}`).set({
    uid,
    authType: 'SINGPASS',
    displayName: uid,
    displayNameLower: uid,
    roles,
    status: 'ACTIVE',
    flagged: false,
    seniorEligible: true,
    prefs: { fontScale: 1 },
    version: 1,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
    ...extra,
  });
}

describe('users-setAccountStatus (emulator): suspend flow', () => {
  const target = `sp_target_${RUN}`;
  beforeAll(async () => {
    await seedUser(ADMIN.uid, ADMIN.roles);
    await seedUser(target, ['LEARNER']);
  });

  it('SUSPEND disables Auth, sets claims, revokes tokens, audits, notifies, bumps version', async () => {
    const res = await setAccountStatus(db, auth, ADMIN, {
      uid: target,
      action: 'SUSPEND',
      reason: 'abuse',
      expectedVersion: 1,
    });
    expect(res).toEqual({ status: 'SUSPENDED', flagged: false, version: 2 });

    const user = (await db.doc(`users/${target}`).get()).data();
    expect(user).toMatchObject({ status: 'SUSPENDED', version: 2 });
    const authUser = await auth.getUser(target);
    expect(authUser.disabled).toBe(true);
    expect(authUser.customClaims).toEqual({ roles: ['LEARNER'], status: 'SUSPENDED' });
    expect(authUser.tokensValidAfterTime).toBeDefined();

    const audit = await db
      .collection('auditLogs')
      .where('targetId', '==', target)
      .where('action', '==', 'ACCOUNT_SUSPEND')
      .get();
    expect(audit.size).toBe(1);
    expect(audit.docs[0]?.data()).toMatchObject({
      actorId: ADMIN.uid,
      outcome: 'SUCCESS',
      details: { reason: 'abuse' },
    });
    const notes = await db.collection('notifications').where('userId', '==', target).get();
    expect(notes.docs[0]?.data()).toMatchObject({ type: 'ACCOUNT_STATUS_CHANGED', read: false });
  });

  it('a suspended account is refused by the callable gate (ACCOUNT_SUSPENDED)', async () => {
    expect(await codeOf(requireCaller(db, target, { roles: ['LEARNER'] }))).toBe(
      'ACCOUNT_SUSPENDED',
    );
  });

  it('repeat SUSPEND repairs a half-applied Auth state without bumping the version (M1)', async () => {
    // Simulate Auth step failing after the Firestore commit: Auth still enabled with ACTIVE claims.
    await auth.updateUser(target, { disabled: false });
    await auth.setCustomUserClaims(target, { roles: ['LEARNER'], status: 'ACTIVE' });
    const res = await setAccountStatus(db, auth, ADMIN, {
      uid: target,
      action: 'SUSPEND',
      reason: 'retry',
      expectedVersion: 2,
    });
    expect(res).toEqual({ status: 'SUSPENDED', flagged: false, version: 2 });
    const authUser = await auth.getUser(target);
    expect(authUser.disabled).toBe(true);
    expect(authUser.customClaims).toEqual({ roles: ['LEARNER'], status: 'SUSPENDED' });
    expect((await db.doc(`users/${target}`).get()).data()).toMatchObject({ version: 2 });
    const notes = await db.collection('notifications').where('userId', '==', target).get();
    expect(notes.size).toBe(1); // no second notification
  });

  it('stale version is rejected; REACTIVATE restores', async () => {
    expect(
      await codeOf(
        setAccountStatus(db, auth, ADMIN, {
          uid: target,
          action: 'REACTIVATE',
          expectedVersion: 1,
        }),
      ),
    ).toBe('STALE_VERSION');
    const res = await setAccountStatus(db, auth, ADMIN, {
      uid: target,
      action: 'REACTIVATE',
      expectedVersion: 2,
    });
    expect(res).toEqual({ status: 'ACTIVE', flagged: false, version: 3 });
    const authUser = await auth.getUser(target);
    expect(authUser.disabled).toBe(false);
    expect(authUser.customClaims).toEqual({ roles: ['LEARNER'], status: 'ACTIVE' });
  });

  it('admins and self cannot be targeted; nothing is written', async () => {
    const other = `st_admin2_${RUN}`;
    await seedUser(other, ['ADMIN']);
    expect(
      await codeOf(
        setAccountStatus(db, auth, ADMIN, {
          uid: other,
          action: 'SUSPEND',
          reason: 'x',
          expectedVersion: 1,
        }),
      ),
    ).toBe('CANNOT_TARGET_ADMIN');
    expect(
      await codeOf(
        setAccountStatus(db, auth, ADMIN, {
          uid: ADMIN.uid,
          action: 'SUSPEND',
          reason: 'x',
          expectedVersion: 1,
        }),
      ),
    ).toBe('CANNOT_TARGET_ADMIN');
    expect((await auth.getUser(other)).disabled).toBe(false);
    expect((await db.doc(`users/${other}`).get()).data()?.status).toBe('ACTIVE');
  });

  it('two concurrent suspends: exactly one wins', async () => {
    const uid = `sp_race_${RUN}`;
    await seedUser(uid, ['VOLUNTEER']);
    const call = () =>
      codeOf(
        setAccountStatus(db, auth, ADMIN, {
          uid,
          action: 'SUSPEND',
          reason: 'r',
          expectedVersion: 1,
        }),
      );
    const results = await Promise.all([call(), call()]);
    expect(results.filter((c) => c === undefined)).toHaveLength(1);
    expect(results.filter((c) => c === 'STALE_VERSION' || c === 'INVALID_TRANSITION')).toHaveLength(
      1,
    );
    const audits = await db
      .collection('auditLogs')
      .where('targetId', '==', uid)
      .where('action', '==', 'ACCOUNT_SUSPEND')
      .get();
    expect(audits.size).toBe(1);
  });

  it('flag / unflag leave Auth untouched', async () => {
    const uid = `sp_flag_${RUN}`;
    await seedUser(uid, ['LEARNER']);
    await setAccountStatus(db, auth, ADMIN, {
      uid,
      action: 'FLAG',
      reason: 'spam',
      expectedVersion: 1,
    });
    expect((await db.doc(`users/${uid}`).get()).data()).toMatchObject({
      flagged: true,
      flagReason: 'spam',
      status: 'ACTIVE',
    });
    expect((await auth.getUser(uid)).disabled).toBe(false);
    await setAccountStatus(db, auth, ADMIN, { uid, action: 'UNFLAG', expectedVersion: 2 });
    expect((await db.doc(`users/${uid}`).get()).data()).toMatchObject({ flagged: false });
    expect((await db.doc(`users/${uid}`).get()).data()).not.toHaveProperty('flagReason');
  });
});

describe('instructor profile (emulator)', () => {
  it('submit -> review approve / reject / resubmit', async () => {
    const si = `sp_si_${RUN}`;
    await seedUser(si, ['LEARNER', 'SENIOR_INSTRUCTOR']);
    const caller = { uid: si, user: (await db.doc(`users/${si}`).get()).data() as User };
    const input = { bio: 'Baker', expertise: ['COOKING' as const], experienceYears: 20 };
    expect(await submitInstructorProfile(db, caller, input)).toEqual({ status: 'PENDING' });
    expect(await codeOf(submitInstructorProfile(db, caller, input))).toBe('INVALID_TRANSITION');

    expect(
      await codeOf(
        reviewInstructorProfile(db, ADMIN, { uid: si, decision: 'REJECT', expectedVersion: 1 }),
      ),
    ).toBe('REASON_REQUIRED');
    const rejected = await reviewInstructorProfile(db, ADMIN, {
      uid: si,
      decision: 'REJECT',
      reason: 'needs detail',
      expectedVersion: 1,
    });
    expect(rejected).toEqual({ status: 'REJECTED', version: 2 });
    expect(
      await codeOf(
        reviewInstructorProfile(db, ADMIN, { uid: si, decision: 'APPROVE', expectedVersion: 2 }),
      ),
    ).toBe('NOT_PENDING');

    await submitInstructorProfile(db, caller, input);
    const profile = (await db.doc(`instructorProfiles/${si}`).get()).data();
    expect(profile).toMatchObject({ status: 'PENDING', version: 3, ratingCount: 0 });
    expect(profile).not.toHaveProperty('reviewReason');

    const ok = await reviewInstructorProfile(db, ADMIN, {
      uid: si,
      decision: 'APPROVE',
      expectedVersion: 3,
    });
    expect(ok).toEqual({ status: 'APPROVED', version: 4 });
    expect(await codeOf(submitInstructorProfile(db, caller, input))).toBe(
      'PROFILE_ALREADY_APPROVED',
    );

    const audits = await db.collection('auditLogs').where('targetId', '==', si).get();
    expect(audits.docs.filter((d) => d.data().action === 'INSTRUCTOR_REVIEW')).toHaveLength(2);
    const notes = await db.collection('notifications').where('userId', '==', si).get();
    expect(notes.docs.filter((d) => d.data().type === 'PROFILE_REVIEWED')).toHaveLength(2);
  });

  it('non-senior-eligible users cannot submit', async () => {
    const uid = `sp_young_${RUN}`;
    await seedUser(uid, ['LEARNER', 'SENIOR_INSTRUCTOR'], { seniorEligible: false });
    const caller = { uid, user: (await db.doc(`users/${uid}`).get()).data() as User };
    expect(
      await codeOf(
        submitInstructorProfile(db, caller, { bio: 'b', expertise: ['MUSIC'], experienceYears: 1 }),
      ),
    ).toBe('NOT_SENIOR_ELIGIBLE');
  });
});

describe('users-createStaffAccount (emulator)', () => {
  it('creates Auth user, claims and users doc; duplicate id is USER_ID_TAKEN', async () => {
    const userId = `partner_${RUN}`;
    const input = {
      userId,
      displayName: 'New Partner',
      role: 'COMMUNITY_PARTNER' as const,
      orgName: 'Org',
      initialPassword: 'correct-horse-9',
    };
    const { uid } = await createStaffAccount(db, auth, ADMIN, input);
    expect(uid).toBe(`st_${userId}`);
    const authUser = await auth.getUser(uid);
    expect(authUser.email).toBe(`${userId}@staff.silveracademy.test`);
    expect(authUser.customClaims).toEqual({ roles: ['COMMUNITY_PARTNER'], status: 'ACTIVE' });
    const doc = (await db.doc(`users/${uid}`).get()).data();
    expect(doc).toMatchObject({
      authType: 'STAFF',
      staffUserId: userId,
      orgName: 'Org',
      roles: ['COMMUNITY_PARTNER'],
      status: 'ACTIVE',
      version: 1,
    });
    const audit = await db.collection('auditLogs').where('targetId', '==', uid).get();
    expect(audit.docs[0]?.data().action).toBe('STAFF_ACCOUNT_CREATE');
    expect(JSON.stringify(audit.docs[0]?.data())).not.toContain('correct-horse');

    expect(await codeOf(createStaffAccount(db, auth, ADMIN, input))).toBe('USER_ID_TAKEN');
  });

  it('an Auth-only collision is USER_ID_TAKEN and leaves no users doc', async () => {
    const userId = `ghost_${RUN}`;
    await auth.createUser({ uid: `st_${userId}` });
    expect(
      await codeOf(
        createStaffAccount(db, auth, ADMIN, {
          userId,
          displayName: 'G',
          role: 'ADMIN',
          initialPassword: 'correct-horse-9',
        }),
      ),
    ).toBe('USER_ID_TAKEN');
    expect((await db.doc(`users/st_${userId}`).get()).exists).toBe(false);
  });
});

describe('preferences and notifications (emulator)', () => {
  it('updates prefs; lastMode must be held', async () => {
    const uid = `sp_prefs_${RUN}`;
    await seedUser(uid, ['LEARNER']);
    const caller = { uid, roles: ['LEARNER'] as Role[] };
    expect(await updatePreferences(db, caller, { fontScale: 1.5, lastMode: 'LEARNER' })).toEqual({
      prefs: { fontScale: 1.5, lastMode: 'LEARNER' },
    });
    expect(await codeOf(updatePreferences(db, caller, { lastMode: 'ADMIN' }))).toBe(
      'INVALID_INPUT',
    );
  });

  it('markNotificationRead: own only, others are NOT_FOUND', async () => {
    const uid = `sp_note_${RUN}`;
    await db.doc(`notifications/n_${RUN}`).set({ id: `n_${RUN}`, userId: uid, read: false });
    expect(await codeOf(markNotificationRead(db, { uid: 'someone-else' }, `n_${RUN}`))).toBe(
      'NOT_FOUND',
    );
    expect(await codeOf(markNotificationRead(db, { uid }, 'missing'))).toBe('NOT_FOUND');
    await markNotificationRead(db, { uid }, `n_${RUN}`);
    expect((await db.doc(`notifications/n_${RUN}`).get()).data()?.read).toBe(true);
  });
});
