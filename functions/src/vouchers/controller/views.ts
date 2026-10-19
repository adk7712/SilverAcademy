// UC #1-7 #5-4 FR 6.27: pure mapping of stored vouchers to callable outputs (codes masked for admins; NFR 6.3).
import { maskVoucherCode, type VoucherStatus } from '@silveracademy/shared';

interface TsLike {
  toDate(): Date;
}
export interface StoredVoucher {
  id: string;
  code: string;
  tierId: string;
  provider: string;
  denomination: number;
  status: VoucherStatus;
  uploadedAt: TsLike;
  claimedBy?: string;
  claimedAt?: TsLike;
}

/** Admin inventory row: the raw code never leaves; only `****<last 4>`. */
export function toInventoryItem(v: StoredVoucher) {
  return {
    voucherId: v.id,
    tierId: v.tierId,
    provider: v.provider,
    denomination: v.denomination,
    codeMasked: maskVoucherCode(v.code),
    status: v.status,
    uploadedAt: v.uploadedAt.toDate().toISOString(),
    ...(v.claimedBy ? { claimedBy: v.claimedBy } : {}),
    ...(v.claimedAt ? { claimedAt: v.claimedAt.toDate().toISOString() } : {}),
  };
}

/** Owner view (listMyVouchers): includes the code. Only call for vouchers claimed by the caller. */
export function toMyVoucher(v: StoredVoucher) {
  return {
    voucherId: v.id,
    provider: v.provider,
    denomination: v.denomination,
    code: v.code,
    claimedAt: (v.claimedAt ?? v.uploadedAt).toDate().toISOString(),
  };
}
