// UC #1-7 vouchers-listMyVouchers: the caller's claimed vouchers with codes (the only read path besides redeem).
import type { Firestore } from 'firebase-admin/firestore';
import { defineCallable, type Caller } from '../../common';
import { listClaimedBy } from '../repo/inventoryRepo';

export async function listMyVouchers(db: Firestore, caller: Caller) {
  return { vouchers: await listClaimedBy(db, caller.uid) };
}

export const listMyVouchersCallable = defineCallable(
  'vouchers-listMyVouchers',
  { roles: ['SENIOR_INSTRUCTOR'] },
  async ({ caller, db }) => listMyVouchers(db, caller),
);
