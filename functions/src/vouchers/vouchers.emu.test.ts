// Emulator integration tests for voucher transactions (UC #1-7, #5-4; arch 4.4, 4.5). Run via `npm run test:emulator`.
import { getApps, initializeApp } from 'firebase-admin/app';
import { Timestamp, getFirestore } from 'firebase-admin/firestore';
import { CALLABLES, type Role, type User } from '@silveracademy/shared';
import type { Caller } from '../common';
import { voucherDocId } from './controller/decideUpload';
import { redeemVoucher } from './handlers/redeemVoucher';
import { listMyVouchers } from './handlers/listMyVouchers';
import { uploadVouchers } from './handlers/uploadVouchers';
import { setVoucherStatus } from './handlers/setVoucherStatus';
import { listInventory } from './handlers/listInventory';
import { upsertTier } from './handlers/upsertTier';

if (getApps().length === 0) initializeApp({ projectId: process.env.GCLOUD_PROJECT });
const db = getFirestore();
const NOW = new Date('2026-10-19T04:00:00Z');
const RACERS = 5;
let seq = 0;
const uniq = (p: string) => `${p}${Date.now().toString(36)}${(seq += 1)}`;

const caller = (uid: string, roles: Role[]): Caller => ({
  uid,
  roles,
  user: { uid, roles, status: 'ACTIVE' } as unknown as User,
});
const admin = caller('st_vadmin', ['ADMIN']);

async function makeTier(pointsCost = 20, denomination = 10) {
  const provider = uniq('P').toUpperCase();
  const { tierId } = await upsertTier(db, admin, {
    provider,
    providerName: `${provider} Mart`,
    denomination,
    pointsCost,
    active: true,
  });
  return { tierId, provider, denomination };
}

async function makeSi(balance: number, profile: 'APPROVED' | 'PENDING' = 'APPROVED') {
  const uid = uniq('sp_si');
  await db.doc(`instructorProfiles/${uid}`).set({ uid, status: profile });
  if (balance > 0) {
    await db
      .doc(`wallets/${uid}`)
      .set({ uid, balance, lifetimeEarned: balance, lifetimeRedeemed: 0 });
  }
  return caller(uid, ['LEARNER', 'SENIOR_INSTRUCTOR']);
}

const upload = (t: { provider: string; denomination: number }, codes: string[], at = NOW) =>
  uploadVouchers(
    db,
    admin,
    { rows: codes.map((code) => ({ provider: t.provider, denomination: t.denomination, code })) },
    at,
  );

const tierDoc = async (id: string) => (await db.doc(`voucherTiers/${id}`).get()).data();
const walletDoc = async (uid: string) => (await db.doc(`wallets/${uid}`).get()).data();
const voucherDoc = async (code: string) =>
  (await db.doc(`voucherInventory/${voucherDocId(code)}`).get()).data();
const ledgerOf = async (uid: string) =>
  (await db.collection(`wallets/${uid}/ledger`).get()).docs.map((d) => ({ id: d.id, ...d.data() }));
const codeFor = (p: string, i: number) => `${p}-CODE-${String(i).padStart(4, '0')}`;

describe('vouchers-redeemVoucher (emulator)', () => {
  it('claims the oldest AVAILABLE code, deducts points, writes ledger/tier/audit atomically', async () => {
    const t = await makeTier(20);
    const older = codeFor(t.provider, 1);
    const newer = codeFor(t.provider, 2);
    await upload(t, [newer], new Date('2026-10-02T00:00:00Z'));
    await upload(t, [older], new Date('2026-10-01T00:00:00Z'));
    const si = await makeSi(50);

    const res = await redeemVoucher(db, si, { tierId: t.tierId }, NOW);
    expect(CALLABLES['vouchers-redeemVoucher'].output.safeParse(res).success).toBe(true);
    expect(res).toEqual({
      voucherId: voucherDocId(older),
      code: older,
      provider: t.provider,
      denomination: 10,
      pointsSpent: 20,
      balanceAfter: 30,
      claimedAt: NOW.toISOString(),
    });
    expect(await walletDoc(si.uid)).toMatchObject({ balance: 30, lifetimeRedeemed: 20 });
    expect(await ledgerOf(si.uid)).toEqual([
      expect.objectContaining({
        id: `redeem_${res.voucherId}`,
        type: 'REDEEM_VOUCHER',
        amount: -20,
        balanceAfter: 30,
        voucherId: res.voucherId,
        tierId: t.tierId,
      }),
    ]);
    expect(JSON.stringify(await ledgerOf(si.uid))).not.toContain(older);
    expect(await voucherDoc(older)).toMatchObject({ status: 'CLAIMED', claimedBy: si.uid });
    expect(await voucherDoc(newer)).toMatchObject({ status: 'AVAILABLE' });
    expect((await tierDoc(t.tierId))?.counts).toEqual({
      AVAILABLE: 1,
      CLAIMED: 1,
      INVALID: 0,
      REMOVED: 0,
    });
    const audits = await db
      .collection('auditLogs')
      .where('action', '==', 'VOUCHER_REDEEM')
      .where('targetId', '==', res.voucherId)
      .get();
    expect(audits.size).toBe(1);
    expect(JSON.stringify(audits.docs[0]?.data())).not.toContain(older);

    expect(await listMyVouchers(db, si)).toEqual({
      vouchers: [
        {
          voucherId: res.voucherId,
          provider: t.provider,
          denomination: 10,
          code: older,
          claimedAt: NOW.toISOString(),
        },
      ],
    });
  });

  it('rejects with no deduction: PROFILE_NOT_APPROVED, TIER_NOT_FOUND, INSUFFICIENT_POINTS, OUT_OF_STOCK', async () => {
    const t = await makeTier(20);
    const empty = await makeTier(20);
    await upload(t, [codeFor(t.provider, 1)]);
    const pending = await makeSi(100, 'PENDING');
    const poor = await makeSi(19);
    const rich = await makeSi(100);

    await expect(redeemVoucher(db, pending, { tierId: t.tierId }, NOW)).rejects.toMatchObject({
      code: 'PROFILE_NOT_APPROVED',
    });
    await expect(redeemVoucher(db, rich, { tierId: 'NOPE_1' }, NOW)).rejects.toMatchObject({
      code: 'TIER_NOT_FOUND',
    });
    await expect(redeemVoucher(db, poor, { tierId: t.tierId }, NOW)).rejects.toMatchObject({
      code: 'INSUFFICIENT_POINTS',
      details: { required: 20, balance: 19 },
    });
    await expect(redeemVoucher(db, rich, { tierId: empty.tierId }, NOW)).rejects.toMatchObject({
      code: 'OUT_OF_STOCK',
    });
    for (const [si, bal] of [
      [pending, 100],
      [poor, 19],
      [rich, 100],
    ] as const) {
      expect((await walletDoc(si.uid))?.balance).toBe(bal);
      expect(await ledgerOf(si.uid)).toEqual([]);
    }
    expect(await voucherDoc(codeFor(t.provider, 1))).toMatchObject({ status: 'AVAILABLE' });
    expect((await tierDoc(t.tierId))?.counts.AVAILABLE).toBe(1);
  });

  it('rolls back every write when the tx fails mid-way (ledger entry collision)', async () => {
    const t = await makeTier(20);
    const code = codeFor(t.provider, 1);
    await upload(t, [code]);
    const si = await makeSi(40);
    // Pre-existing ledger entry makes the tx.create fail after the voucher/wallet writes were staged.
    await db.doc(`wallets/${si.uid}/ledger/redeem_${voucherDocId(code)}`).set({ marker: true });

    await expect(redeemVoucher(db, si, { tierId: t.tierId }, NOW)).rejects.toBeDefined();
    expect(await walletDoc(si.uid)).toMatchObject({ balance: 40, lifetimeRedeemed: 0 });
    expect(await voucherDoc(code)).toMatchObject({ status: 'AVAILABLE' });
    expect((await voucherDoc(code))?.claimedBy).toBeUndefined();
    expect((await tierDoc(t.tierId))?.counts).toMatchObject({ AVAILABLE: 1, CLAIMED: 0 });
  });

  it('concurrent SIs racing for the last voucher: exactly one wins, losers keep their points', async () => {
    const t = await makeTier(20);
    const code = codeFor(t.provider, 1);
    await upload(t, [code]);
    const sis = await Promise.all(Array.from({ length: RACERS }, () => makeSi(20)));

    const results = await Promise.allSettled(
      sis.map((si) => redeemVoucher(db, si, { tierId: t.tierId }, NOW)),
    );
    const won = results.filter((r) => r.status === 'fulfilled');
    const lost = results.filter((r): r is PromiseRejectedResult => r.status === 'rejected');
    expect(won).toHaveLength(1);
    for (const l of lost) expect(['OUT_OF_STOCK', 'BUSY_TRY_AGAIN']).toContain(l.reason.code);

    const balances = await Promise.all(sis.map(async (si) => (await walletDoc(si.uid))?.balance));
    expect(balances.sort()).toEqual([0, 20, 20, 20, 20]);
    expect(await voucherDoc(code)).toMatchObject({ status: 'CLAIMED' });
    expect((await tierDoc(t.tierId))?.counts).toMatchObject({ AVAILABLE: 0, CLAIMED: 1 });
  });

  it('one SI redeeming concurrently with points for only one: one succeeds, balance never negative', async () => {
    const t = await makeTier(20);
    await upload(
      t,
      Array.from({ length: RACERS }, (_, i) => codeFor(t.provider, i + 1)),
    );
    const si = await makeSi(30);

    const results = await Promise.allSettled(
      Array.from({ length: RACERS }, () => redeemVoucher(db, si, { tierId: t.tierId }, NOW)),
    );
    const lost = results.filter((r): r is PromiseRejectedResult => r.status === 'rejected');
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    for (const l of lost)
      expect(['INSUFFICIENT_POINTS', 'BUSY_TRY_AGAIN']).toContain(l.reason.code);

    expect(await walletDoc(si.uid)).toMatchObject({ balance: 10, lifetimeRedeemed: 20 });
    expect(await ledgerOf(si.uid)).toHaveLength(1);
    expect((await tierDoc(t.tierId))?.counts).toMatchObject({ AVAILABLE: RACERS - 1, CLAIMED: 1 });
  });
});

describe('vouchers-uploadVouchers (emulator)', () => {
  it('reports invalid/unknown/duplicate rows, commits the rest, dedupes against inventory', async () => {
    const t = await makeTier(20);
    const a = codeFor(t.provider, 1);
    const b = codeFor(t.provider, 2);
    const res = await uploadVouchers(
      db,
      admin,
      {
        rows: [
          { provider: t.provider, denomination: 10, code: ` ${a.toLowerCase()} ` },
          { provider: t.provider, denomination: 10, code: 'bad!' },
          { provider: t.provider, denomination: 99, code: codeFor(t.provider, 3) },
          { provider: t.provider, denomination: 10, code: a },
          { provider: t.provider, denomination: 10, code: b },
        ],
      },
      NOW,
    );
    expect(res.acceptedCount).toBe(2);
    expect(res.rejected.map((r) => [r.row, r.reason])).toEqual([
      [2, 'INVALID_FORMAT'],
      [3, 'UNKNOWN_TIER'],
      [4, 'DUPLICATE_IN_FILE'],
    ]);
    expect(await voucherDoc(a)).toMatchObject({
      code: a,
      status: 'AVAILABLE',
      uploadBatchId: res.batchId,
      uploadedBy: admin.uid,
    });
    expect((await tierDoc(t.tierId))?.counts.AVAILABLE).toBe(2);
    const batch = (await db.doc(`voucherUploads/${res.batchId}`).get()).data();
    expect(batch).toMatchObject({ acceptedCount: 2, rejectedCount: 3 });
    expect(JSON.stringify(batch)).not.toContain(t.provider + '-CODE');

    const again = await upload(t, [a, codeFor(t.provider, 4)]);
    expect(again.acceptedCount).toBe(1);
    expect(again.rejected).toEqual([
      { row: 1, codeMasked: `****${a.slice(-4)}`, reason: 'DUPLICATE_EXISTING' },
    ]);
    expect((await tierDoc(t.tierId))?.counts.AVAILABLE).toBe(3);
  });

  it('two concurrent uploads of the same codes: each code stored once, counts consistent', async () => {
    const t = await makeTier(20);
    const codes = [1, 2, 3].map((i) => codeFor(t.provider, i));
    const results = await Promise.allSettled([upload(t, codes), upload(t, codes)]);
    const accepted = results
      .filter((r) => r.status === 'fulfilled')
      .map((r) => (r as PromiseFulfilledResult<{ acceptedCount: number }>).value.acceptedCount);
    expect(accepted.reduce((s, n) => s + n, 0)).toBe(3);
    expect((await tierDoc(t.tierId))?.counts.AVAILABLE).toBe(3);
  });
});

describe('vouchers admin status / inventory / tiers (emulator)', () => {
  it('setVoucherStatus: AVAILABLE -> INVALID moves tier counts; then VOUCHER_NOT_AVAILABLE; reason and existence checked', async () => {
    const t = await makeTier(20);
    const code = codeFor(t.provider, 1);
    await upload(t, [code]);
    const id = voucherDocId(code);

    await expect(
      setVoucherStatus(db, admin, { voucherId: id, status: 'INVALID' }),
    ).rejects.toMatchObject({ code: 'REASON_REQUIRED' });
    await expect(
      setVoucherStatus(db, admin, { voucherId: 'missing', status: 'INVALID', reason: 'x' }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
    await expect(
      setVoucherStatus(db, admin, { voucherId: id, status: 'INVALID', reason: 'Broken' }),
    ).resolves.toEqual({ status: 'INVALID' });
    expect(await voucherDoc(code)).toMatchObject({ status: 'INVALID', statusReason: 'Broken' });
    expect((await tierDoc(t.tierId))?.counts).toMatchObject({ AVAILABLE: 0, INVALID: 1 });
    await expect(
      setVoucherStatus(db, admin, { voucherId: id, status: 'REMOVED', reason: 'x' }),
    ).rejects.toMatchObject({ code: 'VOUCHER_NOT_AVAILABLE' });

    // An INVALID code is never handed out.
    const si = await makeSi(100);
    await expect(redeemVoucher(db, si, { tierId: t.tierId }, NOW)).rejects.toMatchObject({
      code: 'OUT_OF_STOCK',
    });
  });

  it('listInventory masks codes, filters by tier/status and paginates', async () => {
    const t = await makeTier(20);
    const codes = [1, 2, 3].map((i) => codeFor(t.provider, i));
    await upload(t, codes);
    await setVoucherStatus(db, admin, {
      voucherId: voucherDocId(codes[0] as string),
      status: 'REMOVED',
      reason: 'gone',
    });

    const page1 = await listInventory(db, { tierId: t.tierId, limit: 2 });
    expect(CALLABLES['vouchers-listInventory'].output.safeParse(page1).success).toBe(true);
    expect(page1.items).toHaveLength(2);
    expect(page1.nextStartAfterId).toBeDefined();
    const page2 = await listInventory(db, {
      tierId: t.tierId,
      limit: 2,
      startAfterId: page1.nextStartAfterId,
    });
    expect(page2.items).toHaveLength(1);
    expect(page2.nextStartAfterId).toBeUndefined();
    const all = [...page1.items, ...page2.items];
    expect(all.map((i) => i.voucherId).sort()).toEqual(codes.map(voucherDocId).sort());
    for (const i of all) expect(i.codeMasked).toMatch(/^\*{4}\d{4}$/);
    expect(JSON.stringify(all)).not.toContain('-CODE-');

    const removed = await listInventory(db, { tierId: t.tierId, status: 'REMOVED' });
    expect(removed.items.map((i) => i.voucherId)).toEqual([voucherDocId(codes[0] as string)]);
  });

  it('upsertTier creates with zero counts and updates without touching counts', async () => {
    const t = await makeTier(20, 5);
    await upload(t, [codeFor(t.provider, 1)]);
    await upsertTier(db, admin, {
      provider: t.provider,
      providerName: 'Renamed',
      denomination: 5,
      pointsCost: 12,
      active: false,
    });
    expect(await tierDoc(t.tierId)).toMatchObject({
      providerName: 'Renamed',
      pointsCost: 12,
      active: false,
      counts: { AVAILABLE: 1, CLAIMED: 0, INVALID: 0, REMOVED: 0 },
    });
    const si = await makeSi(100);
    await expect(redeemVoucher(db, si, { tierId: t.tierId }, NOW)).rejects.toMatchObject({
      code: 'TIER_NOT_FOUND',
    });
  });

  it('uploadedAt is stored as a Timestamp (FIFO order key)', async () => {
    const t = await makeTier(20);
    const code = codeFor(t.provider, 1);
    await upload(t, [code]);
    expect((await voucherDoc(code))?.uploadedAt).toBeInstanceOf(Timestamp);
  });
});
