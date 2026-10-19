// UC #5-4 vouchers-upsertTier: admin creates/updates a voucher tier (`${provider}_${denomination}`); audited.
import type { Firestore } from 'firebase-admin/firestore';
import { defineCallable, type Caller } from '../../common';
import type { TierInput } from '../controller/decideAdmin';
import { upsertTierTx } from '../repo/adminRepo';

export async function upsertTier(db: Firestore, caller: Caller, input: TierInput) {
  return upsertTierTx(db, caller.uid, input);
}

export const upsertTierCallable = defineCallable(
  'vouchers-upsertTier',
  { roles: ['ADMIN'], auditOnDeny: true },
  async ({ input, caller, db }) => upsertTier(db, caller, input),
);
