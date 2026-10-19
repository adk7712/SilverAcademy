// UC #1-5 #1-6 #1-7 tests for wallet/redeem pure logic.
import { AppError } from '@silveracademy/shared';
import type { LedgerRow, TierView } from '../types';
import {
  createSingleFlight,
  isAffordable,
  ledgerTitle,
  shortfall,
  sortLedger,
  sortTiers,
  toRedeemFailure,
} from './voucherLogic';

const tier = (id: string, pointsCost: number): TierView => ({
  id,
  provider: id,
  providerName: id,
  denomination: pointsCost / 10,
  pointsCost,
});
const row = (id: string, createdAtMs: number, extra: Partial<LedgerRow> = {}): LedgerRow => ({
  id,
  type: 'EARN_ATTENDANCE',
  amount: 10,
  balanceAfter: 10,
  description: 'desc',
  createdAtMs,
  ...extra,
});

describe('tiers', () => {
  it('sorts by cost ascending', () => {
    expect(sortTiers([tier('b', 100), tier('a', 50)]).map((t) => t.id)).toEqual(['a', 'b']);
  });
  it('affordability and shortfall', () => {
    expect(isAffordable(tier('a', 50), 50)).toBe(true);
    expect(isAffordable(tier('a', 50), 49)).toBe(false);
    expect(shortfall(tier('a', 50), 20)).toBe(30);
    expect(shortfall(tier('a', 50), 80)).toBe(0);
  });
});

describe('ledger', () => {
  it('sorts newest first', () => {
    expect(sortLedger([row('a', 1), row('b', 3), row('c', 2)]).map((r) => r.id)).toEqual([
      'b',
      'c',
      'a',
    ]);
  });
  it('titles', () => {
    expect(ledgerTitle(row('a', 1, { workshopTitle: 'Tai Chi' }))).toBe('Tai Chi');
    expect(
      ledgerTitle(row('a', 1, { type: 'REDEEM_VOUCHER', provider: 'NTUC', denomination: 10 })),
    ).toBe('NTUC S$10');
    expect(ledgerTitle(row('a', 1, { type: 'ADJUSTMENT' }))).toBe('desc');
  });
});

describe('toRedeemFailure', () => {
  const msg = () => 'm';
  it('insufficient carries required/balance', () => {
    const e = new AppError('INSUFFICIENT_POINTS', undefined, { required: 100, balance: 40 });
    expect(toRedeemFailure(e, msg)).toEqual({ kind: 'INSUFFICIENT', required: 100, balance: 40 });
  });
  it('busy and other', () => {
    expect(toRedeemFailure(new AppError('BUSY_TRY_AGAIN'), msg)).toEqual({ kind: 'BUSY' });
    expect(toRedeemFailure(new AppError('OUT_OF_STOCK'), msg)).toEqual({
      kind: 'OTHER',
      message: 'm',
    });
  });
});

describe('createSingleFlight', () => {
  it('ignores a second call while the first is running', async () => {
    const run = createSingleFlight();
    let calls = 0;
    let release!: () => void;
    const gate = new Promise<void>((r) => (release = r));
    const first = run(async () => {
      calls += 1;
      await gate;
      return 'ok';
    });
    expect(await run(async () => 'second')).toBeUndefined();
    release();
    expect(await first).toBe('ok');
    await run(async () => (calls += 1));
    expect(calls).toBe(2);
  });
});
