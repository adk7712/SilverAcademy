// UC #1-7 Callable wrappers for redeem and my vouchers; no business rules here.
import { callFunction } from '../../../services/callables';
import type { MyVoucherView, RedeemedView } from '../types';

export async function redeemVoucherCall(tierId: string): Promise<RedeemedView> {
  const r = await callFunction('vouchers-redeemVoucher', { tierId });
  return {
    voucherId: r.voucherId,
    code: r.code,
    provider: r.provider,
    denomination: r.denomination,
    pointsSpent: r.pointsSpent,
    balanceAfter: r.balanceAfter,
  };
}

export async function listMyVouchersCall(): Promise<MyVoucherView[]> {
  const r = await callFunction('vouchers-listMyVouchers', {});
  return r.vouchers;
}
