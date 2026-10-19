// UC #1-5 #1-6 #1-7 Local view models for vouchers; entity types come from @silveracademy/shared.
import type { LedgerEntryType } from '@silveracademy/shared';

export interface WalletView {
  balance: number;
  lifetimeEarned: number;
}

export interface TierView {
  id: string;
  provider: string;
  providerName: string;
  denomination: number;
  pointsCost: number;
}

export interface LedgerRow {
  id: string;
  type: LedgerEntryType;
  amount: number;
  balanceAfter: number;
  description: string;
  workshopTitle?: string;
  provider?: string;
  denomination?: number;
  createdAtMs: number;
}

export interface MyVoucherView {
  voucherId: string;
  provider: string;
  denomination: number;
  code: string;
  claimedAt: string;
}

export interface RedeemedView {
  voucherId: string;
  code: string;
  provider: string;
  denomination: number;
  pointsSpent: number;
  balanceAfter: number;
}

/** What the redeem screen shows for a failed attempt. */
export type RedeemFailure =
  | { kind: 'INSUFFICIENT'; required: number; balance: number }
  | { kind: 'BUSY' }
  | { kind: 'OTHER'; message: string };
