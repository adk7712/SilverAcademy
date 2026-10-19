import { planLedgerEntry } from './ledger';

describe('planLedgerEntry', () => {
  it('earning creates a wallet from nothing', () => {
    const plan = planLedgerEntry(undefined, {
      entryId: 'earn_b',
      type: 'EARN_ATTENDANCE',
      amount: 1,
      description: 'x',
    });
    expect(plan.wallet).toEqual({ balance: 1, lifetimeEarned: 1, lifetimeRedeemed: 0 });
    expect(plan.entry).toMatchObject({ id: 'earn_b', amount: 1, balanceAfter: 1 });
  });
  it('spending moves lifetimeRedeemed and keeps balance == sum(amount)', () => {
    const w = { balance: 10, lifetimeEarned: 12, lifetimeRedeemed: 2 };
    const plan = planLedgerEntry(w, {
      entryId: 'redeem_v',
      type: 'REDEEM_VOUCHER',
      amount: -4,
      description: 'x',
    });
    expect(plan.wallet).toEqual({ balance: 6, lifetimeEarned: 12, lifetimeRedeemed: 6 });
    expect(plan.entry.balanceAfter).toBe(6);
  });
  it('overdraft throws INSUFFICIENT_POINTS with details', () => {
    expect(() =>
      planLedgerEntry(
        { balance: 3, lifetimeEarned: 3, lifetimeRedeemed: 0 },
        { entryId: 'e', type: 'REDEEM_VOUCHER', amount: -5, description: 'x' },
      ),
    ).toThrow(
      expect.objectContaining({
        code: 'INSUFFICIENT_POINTS',
        details: { required: 5, balance: 3 },
      }),
    );
  });
});
