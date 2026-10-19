// UC #5-4 vouchers-uploadVouchers: admin bulk upload; invalid/duplicate rows reported, valid rows commit together.
import type { Firestore } from 'firebase-admin/firestore';
import { AppError, MAX_UPLOAD_ROWS, type UploadRow } from '@silveracademy/shared';
import { defineCallable, type Caller } from '../../common';
import { uploadVouchersTx } from '../repo/uploadRepo';

export async function uploadVouchers(
  db: Firestore,
  caller: Caller,
  input: { rows: UploadRow[] },
  now: Date,
) {
  if (input.rows.length > MAX_UPLOAD_ROWS) {
    throw new AppError('UPLOAD_TOO_LARGE', undefined, { max: MAX_UPLOAD_ROWS });
  }
  return uploadVouchersTx(db, caller.uid, input.rows, now);
}

export const uploadVouchersCallable = defineCallable(
  'vouchers-uploadVouchers',
  { roles: ['ADMIN'], auditOnDeny: true },
  async ({ input, caller, now, db }) => uploadVouchers(db, caller, input, now),
);
