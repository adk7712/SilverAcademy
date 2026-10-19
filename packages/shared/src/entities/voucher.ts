// UC #1-5 #1-6 #1-7 #5-4 wallets, ledger, voucher tiers/inventory/uploads entities.
import type { LedgerEntryType, UploadRejectReason, VoucherStatus } from '../enums';
import type { TimestampLike } from './common';

export interface Wallet {
  uid: string;
  balance: number;
  lifetimeEarned: number;
  lifetimeRedeemed: number;
  updatedAt: TimestampLike;
}

/** wallets/{uid}/ledger/{entryId}; immutable. */
export interface LedgerEntry {
  id: string;
  type: LedgerEntryType;
  amount: number;
  balanceAfter: number;
  workshopId?: string;
  workshopTitle?: string;
  bookingId?: string;
  voucherId?: string;
  tierId?: string;
  provider?: string;
  denomination?: number;
  description: string;
  createdAt: TimestampLike;
}

export type VoucherCounts = Record<VoucherStatus, number>;

export interface VoucherTier {
  id: string;
  provider: string;
  providerName: string;
  denomination: number;
  pointsCost: number;
  active: boolean;
  counts: VoucherCounts;
  updatedAt: TimestampLike;
}

/** voucherInventory/{sha256(code)}; server-only collection. */
export interface VoucherInventoryItem {
  id: string;
  code: string;
  tierId: string;
  provider: string;
  denomination: number;
  status: VoucherStatus;
  statusReason?: string;
  uploadBatchId: string;
  uploadedBy: string;
  uploadedAt: TimestampLike;
  claimedBy?: string;
  claimedAt?: TimestampLike;
  updatedAt: TimestampLike;
}

export interface RejectedUploadRow {
  row: number;
  codeMasked: string;
  reason: UploadRejectReason;
}

export interface VoucherUpload {
  id: string;
  uploadedBy: string;
  acceptedCount: number;
  rejectedCount: number;
  rejected: RejectedUploadRow[];
  createdAt: TimestampLike;
}
