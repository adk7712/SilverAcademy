// Task 3.1 end-to-end backend run: real callable HTTP endpoints + Auth emulator tokens, no UI.
// Covers UC #0-1 #0-2 #1-1..#1-7 #2-2 #3-2 #3-4 #4-2 #5-1 #5-4 #5-5 and the rules checks.
// Needs the emulators running and seeded: see docs/dev-guide.md ("End-to-end run").
import { getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { MAX_UPLOAD_ROWS } from '@silveracademy/shared';

const PROJECT = 'demo-silveracademy';
const REGION = 'asia-southeast1';
const FUNCTIONS = `http://127.0.0.1:5001/${PROJECT}/${REGION}`;
const AUTH = 'http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1';
const FIRESTORE_REST = `http://127.0.0.1:8080/v1/projects/${PROJECT}/databases/(default)/documents`;
const API_KEY = 'demo-key';
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD || 'demo-admin-2026';
const PARTNER_PASSWORD = process.env.SEED_PARTNER_PASSWORD || 'demo-partner-2026';
const NEW_SLOT_ID = 'slot-toa-payoh-3';
const NEW_FACILITY_ID = 'fac-toa-payoh';
const TIER_ID = 'DEMOVP_5';

process.env.FIRESTORE_EMULATOR_HOST ||= 'localhost:8080';
if (!getApps().length) initializeApp({ projectId: PROJECT });
const db = getFirestore();

type Json = Record<string, unknown>;
interface Failure {
  code: string;
  status: string;
  details: Json;
}
let passed = 0;
const failures: string[] = [];

function check(name: string, ok: boolean, extra?: unknown): void {
  if (ok) {
    passed++;
    console.log(`  ok   ${name}`);
  } else {
    failures.push(name);
    console.log(`  FAIL ${name}`, extra === undefined ? '' : JSON.stringify(extra));
  }
}

async function post(
  url: string,
  body: Json,
  token?: string,
): Promise<{ status: number; body: Json }> {
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  return { status: res.status, body: (await res.json()) as Json };
}

/** Calls a callable; returns `{ result }` or `{ error }` with the AppErrorCode from details.code. */
async function call(
  name: string,
  data: Json,
  token?: string,
): Promise<{ result?: Json; error?: Failure }> {
  const res = await post(`${FUNCTIONS}/${name}`, { data }, token);
  if (res.body.error) {
    const e = res.body.error as { status?: string; details?: Json };
    return {
      error: {
        code: String(e.details?.code ?? e.status),
        status: String(e.status),
        details: e.details ?? {},
      },
    };
  }
  return { result: res.body.result as Json };
}

async function ok(name: string, data: Json, token?: string): Promise<Json> {
  const r = await call(name, data, token);
  if (r.error) {
    failures.push(`${name} unexpectedly failed: ${r.error.code}`);
    console.log(`  FAIL ${name} ->`, JSON.stringify(r.error));
    throw new Error(`${name} failed`);
  }
  return r.result as Json;
}

async function expectError(
  name: string,
  data: Json,
  token: string | undefined,
  code: string,
): Promise<void> {
  const r = await call(name, data, token);
  // Never print a result body: it may hold a voucher code. Only the error (code/message) is shown.
  check(
    `${name} -> ${code}`,
    r.error?.code === code,
    r.error ?? '(call succeeded; result redacted)',
  );
}

interface Session {
  token: string;
  uid: string;
  refreshToken: string;
}

async function singpassLogin(profileId: string, registerAs?: string): Promise<Session & Json> {
  const out = await ok('auth-exchangeSingpass', {
    assertion: `mock:${profileId}`,
    ...(registerAs ? { registerAs } : {}),
  });
  const signed = await post(`${AUTH}/accounts:signInWithCustomToken?key=${API_KEY}`, {
    token: out.customToken,
    returnSecureToken: true,
  });
  return {
    ...out,
    token: String(signed.body.idToken),
    uid: String(out.uid),
    refreshToken: String(signed.body.refreshToken),
  };
}

async function staffLogin(userId: string, password: string): Promise<Session> {
  const signed = await post(`${AUTH}/accounts:signInWithPassword?key=${API_KEY}`, {
    email: `${userId}@staff.silveracademy.test`,
    password,
    returnSecureToken: true,
  });
  if (!signed.body.idToken)
    throw new Error(`staff sign-in failed for ${userId}: ${JSON.stringify(signed.body)}`);
  return {
    token: String(signed.body.idToken),
    uid: String(signed.body.localId),
    refreshToken: String(signed.body.refreshToken),
  };
}

function claimsOf(idToken: string): Json {
  return JSON.parse(Buffer.from(idToken.split('.')[1] ?? '', 'base64url').toString('utf8')) as Json;
}

async function restGet(path: string, token: string): Promise<number> {
  const res = await fetch(`${FIRESTORE_REST}/${path}`, {
    headers: { authorization: `Bearer ${token}` },
  });
  return res.status;
}

async function restWrite(path: string, token: string): Promise<number> {
  const res = await fetch(`${FIRESTORE_REST}/${path}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
    body: JSON.stringify({ fields: { hacked: { booleanValue: true } } }),
  });
  return res.status;
}

async function section<T>(title: string, fn: () => Promise<T>): Promise<T | undefined> {
  console.log(`\n== ${title}`);
  try {
    return await fn();
  } catch (e) {
    console.log(`  aborted section: ${(e as Error).message}`);
    return undefined;
  }
}

async function main(): Promise<void> {
  // ---- Auth: Singpass mock + staff login (UC #0-1, #0-2)
  const senior = (await section('Singpass mock login (62-year-old instructor)', async () => {
    const s = await singpassLogin('senior-62');
    check(
      'seniorEligible and instructor role',
      s.seniorEligible === true && (s.roles as string[]).includes('SENIOR_INSTRUCTOR'),
      s.roles,
    );
    check(
      'ID token carries roles + ACTIVE status claim',
      claimsOf(s.token).status === 'ACTIVE',
      claimsOf(s.token),
    );
    await expectError(
      'auth-exchangeSingpass',
      { assertion: 'mock:FAIL' },
      undefined,
      'SINGPASS_AUTH_FAILED',
    );
    await expectError(
      'auth-exchangeSingpass',
      { assertion: 'mock:DOWN' },
      undefined,
      'SINGPASS_UNAVAILABLE',
    );
    const young = await singpassLogin('senior-49-edge');
    check('49-year-old is not senior-eligible', young.seniorEligible === false);
    return s;
  })) as Session;
  const admin = (await section('Staff login (admin01) + token refresh', async () => {
    const a = await staffLogin('admin01', ADMIN_PASSWORD);
    check('before recordStaffLogin the claims may lack status', true, claimsOf(a.token).status);
    const rec = await ok(
      'auth-recordStaffLogin',
      { userId: 'admin01', outcome: 'SUCCESS' },
      a.token,
    );
    check('recordStaffLogin returns ADMIN', (rec.roles as string[]).includes('ADMIN'), rec);
    const refreshed = await staffLogin('admin01', ADMIN_PASSWORD);
    check(
      're-issued token has roles + status ACTIVE',
      claimsOf(refreshed.token).status === 'ACTIVE' &&
        JSON.stringify(claimsOf(refreshed.token).roles).includes('ADMIN'),
      claimsOf(refreshed.token),
    );
    await expectError(
      'auth-recordStaffLogin',
      { userId: 'admin01', outcome: 'SUCCESS' },
      undefined,
      'UNAUTHENTICATED',
    );
    return refreshed;
  })) as Session;
  const partner = (await section('Staff login (partner01)', async () => {
    const p = await staffLogin('partner01', PARTNER_PASSWORD);
    await ok('auth-recordStaffLogin', { userId: 'partner01', outcome: 'SUCCESS' }, p.token);
    return staffLogin('partner01', PARTNER_PASSWORD);
  })) as Session;

  // ---- Instructor profile approval for a new instructor (pending seed profile senior-50)
  await section('Instructor profile review (senior-50 pending -> approved)', async () => {
    const s50 = await singpassLogin('senior-50');
    const prof = await db.doc(`instructorProfiles/${s50.uid}`).get();
    check('seeded profile is PENDING', prof.data()?.status === 'PENDING', prof.data()?.status);
    await expectError(
      'workshops-createWorkshop',
      {
        title: 'x',
        description: 'x',
        category: 'DIGITAL_SKILLS',
        capacity: 5,
        materials: '',
        needsVolunteers: false,
        volunteerSlots: 0,
      },
      s50.token,
      'PROFILE_NOT_APPROVED',
    );
    await ok(
      'users-reviewInstructorProfile',
      { uid: s50.uid, decision: 'APPROVE', expectedVersion: prof.data()?.version },
      admin.token,
    );
    check(
      'profile APPROVED',
      (await db.doc(`instructorProfiles/${s50.uid}`).get()).data()?.status === 'APPROVED',
    );
  });

  // ---- Workshop -> venue request -> partner approval
  const workshopId = (await section(
    'Instructor creates workshop, requests venue, partner approves',
    async () => {
      const created = await ok(
        'workshops-createWorkshop',
        {
          title: 'E2E Smartphone Photos',
          description: 'Take and share photos.',
          category: 'DIGITAL_SKILLS',
          capacity: 10,
          materials: 'Phone',
          needsVolunteers: true,
          volunteerSlots: 1,
        },
        senior.token,
      );
      const id = String(created.workshopId);
      check('workshop created as DRAFT', created.status === 'DRAFT');
      const req = await ok(
        'venues-requestVenue',
        { workshopId: id, facilityId: NEW_FACILITY_ID, slotId: NEW_SLOT_ID },
        senior.token,
      );
      check('request PENDING', req.status === 'PENDING', req);
      check(
        'workshop PENDING_VENUE',
        (await db.doc(`workshops/${id}`).get()).data()?.status === 'PENDING_VENUE',
      );
      await expectError(
        'venues-decideVenueRequest',
        { requestId: String(req.requestId), decision: 'APPROVE' },
        senior.token,
        'PERMISSION_DENIED',
      );
      const decided = await ok(
        'venues-decideVenueRequest',
        { requestId: String(req.requestId), decision: 'APPROVE' },
        partner.token,
      );
      check('request APPROVED', decided.status === 'APPROVED', decided);
      const w = (await db.doc(`workshops/${id}`).get()).data();
      check(
        'workshop OPEN with venue + startAt',
        w?.status === 'OPEN' && !!w?.startAt && !!w?.venue,
        w?.status,
      );
      check(
        'slot BOOKED',
        (await db.doc(`facilities/${NEW_FACILITY_ID}/slots/${NEW_SLOT_ID}`).get()).data()
          ?.status === 'BOOKED',
      );
      return id;
    },
  )) as string;

  // ---- Learner books, ticket, scan, points
  const learner = (await section('Learner books workshop', async () =>
    singpassLogin('learner-35'),
  )) as Session;
  const booking = (await section('Booking + ticket QR', async () => {
    const b = await ok('bookings-bookWorkshop', { workshopId }, learner.token);
    check(
      'ticketCode + qrPayload returned',
      typeof b.ticketCode === 'string' && typeof b.qrPayload === 'string',
      Object.keys(b),
    );
    check('seatsRemaining 9', b.seatsRemaining === 9, b.seatsRemaining);
    await expectError('bookings-bookWorkshop', { workshopId }, learner.token, 'ALREADY_BOOKED');
    await expectError(
      'bookings-bookWorkshop',
      { workshopId },
      senior.token,
      'CANNOT_BOOK_OWN_WORKSHOP',
    );
    return b;
  })) as Json;
  await section('Instructor roster + scan + points + wallet + redeem', async () => {
    const roster = await ok('bookings-getRoster', { workshopId }, senior.token);
    check('roster lists the learner', (roster.learners as unknown[]).length === 1, roster.learners);
    check(
      'roster hides ticket codes (H1)',
      !JSON.stringify(roster).includes('ticketCode'),
      roster.learners,
    );
    await expectError(
      'attendance-recordAttendance',
      { workshopId, qrPayload: 'SA1.garbage.sig' },
      senior.token,
      'INVALID_QR',
    );
    await expectError(
      'attendance-recordAttendance',
      { workshopId, qrPayload: String(booking.qrPayload) },
      learner.token,
      'PERMISSION_DENIED',
    );
    const before = (await db.doc(`wallets/${senior.uid}`).get()).data()?.balance as number;
    const scan = await ok(
      'attendance-recordAttendance',
      { workshopId, qrPayload: String(booking.qrPayload) },
      senior.token,
    );
    check('attendance QR + point awarded', scan.method === 'QR' && scan.pointsAwarded === 1, scan);
    await expectError(
      'attendance-recordAttendance',
      { workshopId, qrPayload: String(booking.qrPayload) },
      senior.token,
      'ALREADY_ATTENDED',
    );
    const wallet = (await db.doc(`wallets/${senior.uid}`).get()).data();
    check('wallet balance +1', wallet?.balance === before + 1, { before, after: wallet?.balance });
    const ledger = await db
      .collection(`wallets/${senior.uid}/ledger`)
      .where('type', '==', 'EARN_ATTENDANCE')
      .get();
    check(
      'ledger has an EARN_ATTENDANCE entry for the booking',
      ledger.docs.some((d) => d.data().bookingId === booking.bookingId),
    );
    await expectError(
      'vouchers-redeemVoucher',
      { tierId: 'NOPE_1' },
      senior.token,
      'TIER_NOT_FOUND',
    );
    const redeemed = await ok('vouchers-redeemVoucher', { tierId: TIER_ID }, senior.token);
    check('voucher code returned', typeof redeemed.code === 'string', Object.keys(redeemed));
    check(
      'balance decreased by cost',
      (redeemed.balanceAfter as number) === before + 1 - (redeemed.pointsSpent as number),
      { balanceAfter: redeemed.balanceAfter, pointsSpent: redeemed.pointsSpent },
    );
    const mine = await ok('vouchers-listMyVouchers', {}, senior.token);
    check(
      'listMyVouchers includes it',
      (mine.vouchers as Json[]).some((v) => v.voucherId === redeemed.voucherId),
    );
  });

  // ---- Volunteer opt-in + scan
  await section('Volunteer opt-in + scan (manual code)', async () => {
    const vol = await singpassLogin('volunteer-28');
    await expectError(
      'attendance-recordAttendance',
      { workshopId, ticketCode: 'ZZZZZZZZ' },
      vol.token,
      'TICKET_NOT_FOUND',
    );
    const optIn = await ok('workshops-optInVolunteer', { workshopId }, vol.token);
    check('opt-in ASSIGNED', optIn.status === 'ASSIGNED', optIn);
    await expectError('workshops-optInVolunteer', { workshopId }, vol.token, 'ALREADY_OPTED_IN');
    const learner2 = await singpassLogin('senior-49-edge');
    const b2 = await ok('bookings-bookWorkshop', { workshopId }, learner2.token);
    const scan = await ok(
      'attendance-recordAttendance',
      { workshopId, ticketCode: String(b2.ticketCode) },
      vol.token,
    );
    check('volunteer manual scan records MANUAL', scan.method === 'MANUAL', scan);
    const roster = await ok('bookings-getRoster', { workshopId }, vol.token);
    check(
      'volunteer reads roster, 2 attended',
      (roster.workshop as Json).attendedCount === 2,
      roster.workshop,
    );
  });

  // ---- Admin voucher upload + dedupe
  await section('Admin voucher upload dedupe', async () => {
    const stamp = Date.now().toString(36).toUpperCase();
    const rows = [
      { provider: 'DEMOVP', denomination: 5, code: `E2E-${stamp}-0001` },
      { provider: 'DEMOVP', denomination: 5, code: `E2E-${stamp}-0002` },
      { provider: 'DEMOVP', denomination: 5, code: `e2e-${stamp}-0001` },
      { provider: 'DEMOVP', denomination: 5, code: 'DEMOVP-05-0001' },
      { provider: 'NOSUCH', denomination: 5, code: `E2E-${stamp}-0003` },
      { provider: 'DEMOVP', denomination: 5, code: '!!' },
    ];
    const first = await ok('vouchers-uploadVouchers', { rows }, admin.token);
    const reasons = (first.rejected as Json[]).map((r) => r.reason).sort();
    check('2 accepted', first.acceptedCount === 2, first);
    check(
      'rejections: dup-in-file, dup-existing, unknown tier, invalid format',
      JSON.stringify(reasons) ===
        JSON.stringify([
          'DUPLICATE_EXISTING',
          'DUPLICATE_IN_FILE',
          'INVALID_FORMAT',
          'UNKNOWN_TIER',
        ]),
      reasons,
    );
    check(
      'rejected codes are masked',
      (first.rejected as Json[]).every((r) => !String(r.codeMasked).includes(stamp)),
      first.rejected,
    );
    const second = await ok('vouchers-uploadVouchers', { rows: rows.slice(0, 2) }, admin.token);
    check(
      're-upload accepts 0, all DUPLICATE_EXISTING',
      second.acceptedCount === 0 &&
        (second.rejected as Json[]).every((r) => r.reason === 'DUPLICATE_EXISTING'),
      second,
    );
    const big = Array.from({ length: MAX_UPLOAD_ROWS + 1 }, (_, i) => ({
      provider: 'DEMOVP',
      denomination: 5,
      code: `BIG-${stamp}-${i}`,
    }));
    await expectError('vouchers-uploadVouchers', { rows: big }, admin.token, 'UPLOAD_TOO_LARGE');
    await expectError('vouchers-uploadVouchers', { rows }, senior.token, 'PERMISSION_DENIED');
    const inv = await ok('vouchers-listInventory', { tierId: TIER_ID, limit: 5 }, admin.token);
    check(
      'listInventory masks codes',
      (inv.items as Json[]).every((i) => String(i.codeMasked).startsWith('*')),
      inv.items,
    );
  });

  // ---- Suspend flow
  await section('Admin suspend / reactivate', async () => {
    const learnerDoc = (await db.doc(`users/${learner.uid}`).get()).data();
    await expectError(
      'users-setAccountStatus',
      { uid: learner.uid, action: 'SUSPEND', expectedVersion: learnerDoc?.version },
      admin.token,
      'REASON_REQUIRED',
    );
    const suspended = await ok(
      'users-setAccountStatus',
      {
        uid: learner.uid,
        action: 'SUSPEND',
        reason: 'e2e check',
        expectedVersion: learnerDoc?.version,
      },
      admin.token,
    );
    check('status SUSPENDED', suspended.status === 'SUSPENDED', suspended);
    await expectError(
      'bookings-bookWorkshop',
      { workshopId: 'ws-01' },
      learner.token,
      'ACCOUNT_SUSPENDED',
    );
    const relog = await call('auth-exchangeSingpass', { assertion: 'mock:learner-35' });
    check(
      'suspended user login refused (ACCOUNT_SUSPENDED)',
      relog.error?.code === 'ACCOUNT_SUSPENDED',
      relog,
    );
    await ok(
      'users-setAccountStatus',
      { uid: learner.uid, action: 'REACTIVATE', expectedVersion: suspended.version },
      admin.token,
    );
    const again = await singpassLogin('learner-35');
    check('reactivated user logs in again', claimsOf(again.token).status === 'ACTIVE');
  });

  // ---- Rules
  await section('Firestore rules via REST with real ID tokens', async () => {
    const learnerNow = await singpassLogin('learner-35');
    const invDoc = (await db.collection('voucherInventory').limit(1).get()).docs[0];
    if (!invDoc) throw new Error('no voucherInventory docs seeded');
    check(
      'learner cannot read voucherInventory',
      (await restGet(`voucherInventory/${invDoc.id}`, learnerNow.token)) === 403,
    );
    check(
      'instructor cannot read voucherInventory',
      (await restGet(`voucherInventory/${invDoc.id}`, senior.token)) === 403,
    );
    check(
      'admin cannot read voucherInventory directly either',
      (await restGet(`voucherInventory/${invDoc.id}`, admin.token)) === 403,
    );
    check(
      'learner cannot write own wallet',
      (await restWrite(`wallets/${learnerNow.uid}`, learnerNow.token)) === 403,
    );
    check(
      'learner cannot write bookings',
      (await restWrite(`bookings/ws-01_${learnerNow.uid}`, learnerNow.token)) === 403,
    );
    check(
      'learner cannot write users doc',
      (await restWrite(`users/${learnerNow.uid}`, learnerNow.token)) === 403,
    );
    check(
      'instructor cannot write workshops directly',
      (await restWrite(`workshops/${workshopId}`, senior.token)) === 403,
    );
    check(
      'learner can read own booking',
      (await restGet(`bookings/${workshopId}_${learnerNow.uid}`, learnerNow.token)) === 200,
    );
    check(
      'learner cannot read another wallet',
      (await restGet(`wallets/${senior.uid}`, learnerNow.token)) === 403,
    );
    check(
      'instructor reads own wallet',
      (await restGet(`wallets/${senior.uid}`, senior.token)) === 200,
    );
    check(
      'unauthenticated cannot read workshops list doc',
      (await restGet(`workshops/${workshopId}`, 'bad')) !== 200,
    );
  });
}

main()
  .catch((e) => {
    failures.push(`fatal: ${(e as Error).message}`);
  })
  .finally(() => {
    console.log(`\n${passed} checks passed, ${failures.length} failed`);
    failures.forEach((f) => console.log(`  - ${f}`));
    process.exit(failures.length === 0 ? 0 : 1);
  });
