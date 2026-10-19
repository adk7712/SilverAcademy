// Unit tests for the pure voucher rules (UC #1-7, #5-4): no Firebase, no emulator.
import { MAX_UPLOAD_ROWS, type UploadRow } from '@silveracademy/shared';
import { decideRedeem, type RedeemSnapshots } from './controller/decideRedeem';
import {
  decideUpload,
  planUpload,
  referencedTierIds,
  voucherDocId,
} from './controller/decideUpload';
import { decideUpsertTier, decideVoucherStatus, requireReason } from './controller/decideAdmin';
import { toInventoryItem, toMyVoucher } from './controller/views';

const codeOf = (fn: () => unknown) => {
  try {
    fn();
  } catch (e) {
    return (e as { code?: string }).code;
  }
  return undefined;
};
const errOf = (fn: () => unknown) => {
  try {
    fn();
  } catch (e) {
    return e as { code: string; details?: unknown };
  }
  throw new Error('expected throw');
};

describe('decideRedeem (arch 4.4 check order)', () => {
  const ok: RedeemSnapshots = {
    profileStatus: 'APPROVED',
    tier: { provider: 'NTUC', denomination: 10, pointsCost: 20, active: true },
    balance: 25,
    candidate: { id: 'v1', code: 'ABCD-12345', tierId: 'NTUC_10', status: 'AVAILABLE' },
  };

  it('returns the candidate and cost', () => {
    expect(decideRedeem(ok)).toEqual({
      voucherId: 'v1',
      code: 'ABCD-12345',
      cost: 20,
      provider: 'NTUC',
      denomination: 10,
    });
  });
  it('profile not approved first (even with no tier, no points, no stock)', () => {
    const all = {
      profileStatus: 'PENDING' as const,
      tier: undefined,
      balance: 0,
      candidate: undefined,
    };
    expect(codeOf(() => decideRedeem(all))).toBe('PROFILE_NOT_APPROVED');
    expect(codeOf(() => decideRedeem({ ...ok, profileStatus: undefined }))).toBe(
      'PROFILE_NOT_APPROVED',
    );
  });
  it('then TIER_NOT_FOUND for missing or inactive tier', () => {
    expect(codeOf(() => decideRedeem({ ...ok, tier: undefined, balance: 0 }))).toBe(
      'TIER_NOT_FOUND',
    );
    expect(codeOf(() => decideRedeem({ ...ok, tier: { ...ok.tier!, active: false } }))).toBe(
      'TIER_NOT_FOUND',
    );
  });
  it('then INSUFFICIENT_POINTS with details, before OUT_OF_STOCK; missing wallet = 0', () => {
    const e = errOf(() => decideRedeem({ ...ok, balance: 19, candidate: undefined }));
    expect(e).toMatchObject({
      code: 'INSUFFICIENT_POINTS',
      details: { required: 20, balance: 19 },
    });
    expect(errOf(() => decideRedeem({ ...ok, balance: undefined }))).toMatchObject({
      details: { required: 20, balance: 0 },
    });
  });
  it('exact balance is enough', () => {
    expect(decideRedeem({ ...ok, balance: 20 }).cost).toBe(20);
  });
  it('then OUT_OF_STOCK when no candidate or it is not AVAILABLE', () => {
    expect(codeOf(() => decideRedeem({ ...ok, candidate: undefined }))).toBe('OUT_OF_STOCK');
    expect(
      codeOf(() => decideRedeem({ ...ok, candidate: { ...ok.candidate!, status: 'CLAIMED' } })),
    ).toBe('OUT_OF_STOCK');
  });
});

describe('planUpload / decideUpload (arch 4.5)', () => {
  const row = (code: string, provider = 'NTUC', denomination = 10): UploadRow => ({
    provider,
    denomination,
    code,
  });
  const active = new Set(['NTUC_10', 'NTUC_20']);

  it('voucherDocId is sha256 hex of the normalised code', () => {
    expect(voucherDocId('ABC')).toBe(
      'b5d4045c3f466fa91fe2cc6abe79232a1a57cdf104f7a26e716e0a1e2789df78',
    );
  });
  it('referencedTierIds is distinct', () => {
    expect(referencedTierIds([row('A'), row('B'), row('C', 'X', 5)])).toEqual(['NTUC_10', 'X_5']);
  });
  it('classifies INVALID_FORMAT, UNKNOWN_TIER, DUPLICATE_IN_FILE and normalises survivors', () => {
    const plan = planUpload(
      [
        row('  abcd-12345 '),
        row('short'),
        row('ABCD-99999', 'NTUC', 50),
        row('ABCD-12345'),
        row('EFGH-12345', 'NTUC', 20),
      ],
      active,
    );
    expect(plan.survivors).toEqual([
      expect.objectContaining({
        row: 1,
        code: 'ABCD-12345',
        tierId: 'NTUC_10',
        id: voucherDocId('ABCD-12345'),
      }),
      expect.objectContaining({ row: 5, code: 'EFGH-12345', tierId: 'NTUC_20', denomination: 20 }),
    ]);
    expect(plan.rejected).toEqual([
      { row: 2, codeMasked: '****HORT', reason: 'INVALID_FORMAT' },
      { row: 3, codeMasked: '****9999', reason: 'UNKNOWN_TIER' },
      { row: 4, codeMasked: '****2345', reason: 'DUPLICATE_IN_FILE' },
    ]);
  });
  it('rejected codes are always masked (no raw code in the report)', () => {
    const plan = planUpload([row('SECRET-CODE-0001'), row('SECRET-CODE-0001')], active);
    const d = decideUpload(plan, new Set([voucherDocId('SECRET-CODE-0001')]));
    expect(JSON.stringify(d.rejected)).not.toContain('SECRET');
  });
  it('existing ids are DUPLICATE_EXISTING; others accepted with per-tier counts; rejected sorted by row', () => {
    const plan = planUpload(
      [row('AAAA-00001'), row('bad'), row('AAAA-00002'), row('AAAA-00003', 'NTUC', 20)],
      active,
    );
    const d = decideUpload(plan, new Set([voucherDocId('AAAA-00001')]));
    expect(d.accepted.map((a) => a.row)).toEqual([3, 4]);
    expect(d.perTier).toEqual({ NTUC_10: 1, NTUC_20: 1 });
    expect(d.rejected.map((r) => [r.row, r.reason])).toEqual([
      [1, 'DUPLICATE_EXISTING'],
      [2, 'INVALID_FORMAT'],
    ]);
  });
  it('MAX_UPLOAD_ROWS valid rows on one tier fit the write budget', () => {
    const rows = Array.from({ length: MAX_UPLOAD_ROWS }, (_, i) =>
      row(`CODE-${String(i).padStart(6, '0')}`),
    );
    expect(decideUpload(planUpload(rows, active), new Set()).accepted).toHaveLength(
      MAX_UPLOAD_ROWS,
    );
  });
  it('UPLOAD_TOO_LARGE when accepted + tier writes exceed the tx cap', () => {
    const many = new Set<string>();
    const rows = Array.from({ length: MAX_UPLOAD_ROWS }, (_, i) => {
      many.add(`P${i}_10`);
      return row(`CODE-${String(i).padStart(6, '0')}`, `P${i}`);
    });
    expect(codeOf(() => decideUpload(planUpload(rows, many), new Set()))).toBe('UPLOAD_TOO_LARGE');
  });
});

describe('admin decisions', () => {
  it('requireReason trims; blank or missing -> REASON_REQUIRED', () => {
    expect(requireReason('  broken  ')).toBe('broken');
    expect(codeOf(() => requireReason(undefined))).toBe('REASON_REQUIRED');
    expect(codeOf(() => requireReason('   '))).toBe('REASON_REQUIRED');
  });
  it('decideVoucherStatus: NOT_FOUND -> VOUCHER_NOT_AVAILABLE -> change', () => {
    expect(codeOf(() => decideVoucherStatus(undefined, 'INVALID'))).toBe('NOT_FOUND');
    for (const s of ['CLAIMED', 'INVALID', 'REMOVED'] as const) {
      expect(codeOf(() => decideVoucherStatus({ status: s, tierId: 'T' }, 'REMOVED'))).toBe(
        'VOUCHER_NOT_AVAILABLE',
      );
    }
    expect(decideVoucherStatus({ status: 'AVAILABLE', tierId: 'T' }, 'INVALID')).toEqual({
      from: 'AVAILABLE',
      to: 'INVALID',
      tierId: 'T',
    });
  });
  it('decideUpsertTier: id provider_denomination, zero counts on create, keeps counts on update', () => {
    const input = {
      provider: 'NTUC',
      providerName: 'NTUC',
      denomination: 10,
      pointsCost: 20,
      active: true,
    };
    const created = decideUpsertTier(undefined, input);
    expect(created).toMatchObject({ id: 'NTUC_10', created: true });
    expect(created.doc.counts).toEqual({ AVAILABLE: 0, CLAIMED: 0, INVALID: 0, REMOVED: 0 });
    const counts = { AVAILABLE: 3, CLAIMED: 1, INVALID: 0, REMOVED: 2 };
    const updated = decideUpsertTier({ counts }, { ...input, pointsCost: 25 });
    expect(updated).toMatchObject({ created: false, doc: { counts, pointsCost: 25 } });
  });
});

describe('views', () => {
  const ts = (iso: string) => ({ toDate: () => new Date(iso) });
  const v = {
    id: 'h1',
    code: 'NTUC-ABCD-7788',
    tierId: 'NTUC_10',
    provider: 'NTUC',
    denomination: 10,
    status: 'CLAIMED' as const,
    uploadedAt: ts('2026-10-01T00:00:00.000Z'),
    claimedBy: 'u1',
    claimedAt: ts('2026-10-02T00:00:00.000Z'),
  };
  it('admin item masks the code and never contains it', () => {
    const item = toInventoryItem(v);
    expect(item).toEqual({
      voucherId: 'h1',
      tierId: 'NTUC_10',
      provider: 'NTUC',
      denomination: 10,
      codeMasked: '****7788',
      status: 'CLAIMED',
      uploadedAt: '2026-10-01T00:00:00.000Z',
      claimedBy: 'u1',
      claimedAt: '2026-10-02T00:00:00.000Z',
    });
    expect(JSON.stringify(item)).not.toContain('ABCD');
  });
  it('owner view includes the code', () => {
    expect(toMyVoucher(v)).toEqual({
      voucherId: 'h1',
      provider: 'NTUC',
      denomination: 10,
      code: 'NTUC-ABCD-7788',
      claimedAt: '2026-10-02T00:00:00.000Z',
    });
  });
});
