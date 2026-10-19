// Firestore rules tests (architecture.md 3.4): per-role reads, query constraints, and total write denial.
import {
  assertFails,
  assertSucceeds,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  collection,
  collectionGroup,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  deleteDoc,
  where,
} from 'firebase/firestore';
import { as, createEnv, ids, personas } from './env';

let env: RulesTestEnvironment;
let p: ReturnType<typeof personas>;

type Ctx = ReturnType<typeof personas>[keyof ReturnType<typeof personas>];
const read = (c: Ctx, path: string) => getDoc(doc(c.firestore(), path));

/** path -> data, written with rules disabled. */
const DOCS: Record<string, Record<string, unknown>> = {
  [`users/${ids.learner}`]: { uid: ids.learner, roles: ['LEARNER'] },
  [`instructorProfiles/${ids.instructor}`]: { uid: ids.instructor, status: 'APPROVED' },
  'workshops/w-open': { instructorId: ids.instructor, status: 'OPEN' },
  'workshops/w-done': { instructorId: ids.instructor, status: 'COMPLETED' },
  'workshops/w-cancelled': { instructorId: ids.instructor, status: 'CANCELLED' },
  'workshops/w-draft': { instructorId: ids.instructor, status: 'DRAFT' },
  'workshops/w-pending': { instructorId: ids.instructor, status: 'PENDING_VENUE' },
  'workshops/w-archived': { instructorId: ids.instructor, status: 'ARCHIVED' },
  'facilities/f1': { partnerId: ids.partner },
  'facilities/f1/slots/s1': { partnerId: ids.partner, status: 'AVAILABLE', startAt: 1 },
  'venueRequests/vr1': { instructorId: ids.instructor, partnerId: ids.partner },
  [`bookings/w-open_${ids.learner}`]: { learnerId: ids.learner, workshopId: 'w-open' },
  [`attendance/w-open_${ids.learner}`]: { learnerId: ids.learner, instructorId: ids.instructor },
  [`volunteerAssignments/w-open_${ids.volunteer}`]: { volunteerId: ids.volunteer },
  [`feedback/w-open_${ids.learner}`]: { learnerId: ids.learner },
  [`wallets/${ids.instructor}`]: { balance: 3 },
  [`wallets/${ids.instructor}/ledger/e1`]: { amount: 1 },
  'voucherTiers/NTUC_10': { active: true },
  'voucherInventory/v1': { code: 'SECRET-CODE-1', status: 'AVAILABLE' },
  'voucherUploads/b1': { acceptedCount: 1 },
  'incidents/SA-261019-ABCDE': { reporterId: ids.learner },
  'notifications/n1': { userId: ids.learner },
  'auditLogs/a1': { actorId: ids.admin },
};

beforeAll(async () => {
  env = await createEnv();
  p = personas(env);
});
afterAll(() => env.cleanup());
beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    for (const [path, data] of Object.entries(DOCS)) await setDoc(doc(ctx.firestore(), path), data);
  });
});

describe('writes are denied for every persona on every collection', () => {
  const personaNames = ['learner', 'instructor', 'volunteer', 'partner', 'admin'] as const;
  for (const path of Object.keys(DOCS)) {
    it(path, async () => {
      for (const name of personaNames) {
        const db = p[name].firestore();
        await assertFails(setDoc(doc(db, `${path}-new`), { x: 1 }));
        await assertFails(updateDoc(doc(db, path), { x: 1 }));
        await assertFails(deleteDoc(doc(db, path)));
      }
    });
  }
  it('unknown collections are denied for read and write', async () => {
    await assertFails(setDoc(doc(p.admin.firestore(), 'mystery/m1'), { x: 1 }));
    await assertFails(read(p.admin, 'mystery/m1'));
  });
});

describe('identity gates', () => {
  it('unauthenticated, suspended and status-less tokens read nothing', async () => {
    for (const c of [p.anon, p.suspended, p.noStatus]) {
      await assertFails(read(c, `users/${ids.learner}`));
      await assertFails(read(c, 'facilities/f1'));
      await assertFails(read(c, 'voucherTiers/NTUC_10'));
    }
  });
  it('a suspended admin cannot read admin data', async () => {
    const c = env.authenticatedContext(ids.admin, { roles: ['ADMIN'], status: 'SUSPENDED' });
    await assertFails(read(c, 'auditLogs/a1'));
  });
});

describe('owner-or-admin collections', () => {
  const cases: [string, string, keyof typeof p][] = [
    [`users/${ids.learner}`, 'learner', 'other'],
    [`instructorProfiles/${ids.instructor}`, 'instructor', 'learner'],
    [`bookings/w-open_${ids.learner}`, 'learner', 'other'],
    [`attendance/w-open_${ids.learner}`, 'learner', 'other'],
    [`volunteerAssignments/w-open_${ids.volunteer}`, 'volunteer', 'learner'],
    [`feedback/w-open_${ids.learner}`, 'learner', 'other'],
    [`wallets/${ids.instructor}`, 'instructor', 'learner'],
    [`wallets/${ids.instructor}/ledger/e1`, 'instructor', 'learner'],
    ['incidents/SA-261019-ABCDE', 'learner', 'other'],
    ['notifications/n1', 'learner', 'other'],
    ['venueRequests/vr1', 'instructor', 'learner'],
  ];
  for (const [path, owner, stranger] of cases) {
    it(`${path}: ${owner} yes, ${stranger} no`, async () => {
      await assertSucceeds(read(p[owner as keyof typeof p], path));
      await assertFails(read(p[stranger], path));
    });
  }
  it('admin reads everything except notifications and the voucher inventory', async () => {
    for (const [path] of cases.filter(([path]) => !path.startsWith('notifications'))) {
      await assertSucceeds(read(p.admin, path));
    }
    await assertFails(read(p.admin, 'notifications/n1'));
  });
  it('instructor attendance and CP request visibility', async () => {
    await assertSucceeds(read(p.instructor, `attendance/w-open_${ids.learner}`));
    await assertSucceeds(read(p.partner, 'venueRequests/vr1'));
  });
  it('instructors cannot read learner bookings (they use bookings-getRoster)', async () => {
    await assertFails(read(p.instructor, `bookings/w-open_${ids.learner}`));
  });
});

describe('workshops (rules are not filters)', () => {
  it('learners read OPEN, COMPLETED, CANCELLED but not DRAFT, PENDING_VENUE or ARCHIVED', async () => {
    for (const id of ['w-open', 'w-done', 'w-cancelled'])
      await assertSucceeds(read(p.learner, `workshops/${id}`));
    for (const id of ['w-draft', 'w-pending', 'w-archived'])
      await assertFails(read(p.learner, `workshops/${id}`));
  });
  it('community partners cannot browse workshops', async () => {
    await assertFails(read(p.partner, 'workshops/w-open'));
  });
  it('owner reads own DRAFT; another instructor cannot', async () => {
    await assertSucceeds(read(p.instructor, 'workshops/w-draft'));
    await assertFails(read(as(env, 'u-instructor-2', ['SENIOR_INSTRUCTOR']), 'workshops/w-draft'));
  });
  it('directory query status==OPEN passes; unconstrained or mixed-status queries fail for learners', async () => {
    const col = (c: Ctx) => collection(c.firestore(), 'workshops');
    await assertSucceeds(getDocs(query(col(p.learner), where('status', '==', 'OPEN'))));
    await assertSucceeds(
      getDocs(query(col(p.learner), where('status', 'in', ['OPEN', 'COMPLETED']))),
    );
    await assertFails(getDocs(col(p.learner)));
    await assertFails(getDocs(query(col(p.learner), where('status', 'in', ['OPEN', 'DRAFT']))));
    await assertFails(getDocs(query(col(p.learner), where('instructorId', '==', ids.instructor))));
  });
  it('"My Workshops" query by instructorId==uid passes, even for DRAFTs', async () => {
    const q = query(
      collection(p.instructor.firestore(), 'workshops'),
      where('instructorId', '==', ids.instructor),
    );
    const snap = await assertSucceeds(getDocs(q));
    expect(snap.size).toBe(6);
  });
  it('admin can list all workshops unconstrained', async () => {
    const snap = await assertSucceeds(getDocs(collection(p.admin.firestore(), 'workshops')));
    expect(snap.size).toBe(6);
  });
});

describe('venue data and vouchers', () => {
  it('any active user reads facilities, slots (incl. collection group) and tiers', async () => {
    for (const c of [p.learner, p.partner, p.volunteer, p.instructor]) {
      await assertSucceeds(read(c, 'facilities/f1'));
      await assertSucceeds(read(c, 'facilities/f1/slots/s1'));
      await assertSucceeds(read(c, 'voucherTiers/NTUC_10'));
      await assertSucceeds(
        getDocs(query(collectionGroup(c.firestore(), 'slots'), where('status', '==', 'AVAILABLE'))),
      );
    }
  });
  it('voucherInventory is never readable, even by admin', async () => {
    for (const c of [p.learner, p.instructor, p.admin]) {
      await assertFails(read(c, 'voucherInventory/v1'));
      await assertFails(getDocs(collection(c.firestore(), 'voucherInventory')));
    }
  });
  it('voucherUploads and auditLogs are admin only', async () => {
    await assertSucceeds(read(p.admin, 'voucherUploads/b1'));
    await assertSucceeds(read(p.admin, 'auditLogs/a1'));
    for (const c of [p.learner, p.instructor, p.partner]) {
      await assertFails(read(c, 'voucherUploads/b1'));
      await assertFails(read(c, 'auditLogs/a1'));
    }
  });
});
