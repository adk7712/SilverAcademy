// Local view models for vouchers; entity types come from @silveracademy/shared.
import type { CallableOutput, VoucherCounts } from '@silveracademy/shared';

export interface TierView {
  id: string;
  provider: string;
  providerName: string;
  denomination: number;
  pointsCost: number;
  active: boolean;
  counts: VoucherCounts;
}

export type InventoryItem = CallableOutput<'vouchers-listInventory'>['items'][number];
export type UploadResult = CallableOutput<'vouchers-uploadVouchers'>;
