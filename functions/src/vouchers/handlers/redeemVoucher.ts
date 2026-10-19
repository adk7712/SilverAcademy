// UC #1-7 vouchers-redeemVoucher: SI spends points on the oldest AVAILABLE code of a tier (architecture.md 4.4).
import type { Firestore } from 'firebase-admin/firestore';
import { defineCallable, type Caller } from '../../common';
import { redeemVoucherTx } from '../repo/redeemRepo';

export async function redeemVoucher(
  db: Firestore,
  caller: Caller,
  input: { tierId: string },
  now: Date,
) {
  return redeemVoucherTx(db, caller.uid, 'SENIOR_INSTRUCTOR', input.tierId, now);
}

export const redeemVoucherCallable = defineCallable(
  'vouchers-redeemVoucher',
  { roles: ['SENIOR_INSTRUCTOR'] },
  async ({ input, caller, now, db }) => redeemVoucher(db, caller, input, now),
);
