// UC #5-4 (alt) vouchers-setVoucherStatus: admin marks an AVAILABLE voucher INVALID or REMOVED (reason required).
import type { Firestore } from 'firebase-admin/firestore';
import type { VoucherAdminStatus } from '@silveracademy/shared';
import { defineCallable, type Caller } from '../../common';
import { requireReason } from '../controller/decideAdmin';
import { setVoucherStatusTx } from '../repo/adminRepo';

export async function setVoucherStatus(
  db: Firestore,
  caller: Caller,
  input: { voucherId: string; status: VoucherAdminStatus; reason?: string },
) {
  const reason = requireReason(input.reason);
  return setVoucherStatusTx(db, caller.uid, input.voucherId, input.status, reason);
}

export const setVoucherStatusCallable = defineCallable(
  'vouchers-setVoucherStatus',
  { roles: ['ADMIN'], auditOnDeny: true },
  async ({ input, caller, db }) => setVoucherStatus(db, caller, input),
);
