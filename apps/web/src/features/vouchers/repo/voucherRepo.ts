// UC #5-4: voucher reads (tiers, direct) and writes (callables only).
import { collection, getDocs } from 'firebase/firestore';
import type { UploadRow, VoucherCounts, VoucherStatus } from '@silveracademy/shared';
import { callFunction, firestore } from '../../../services';
import { emptyCounts } from '../controller/inventorySummary';
import type { InventoryItem, TierView, UploadResult } from '../types';
import type { TierInput } from '../controller/voucherForms';

export async function fetchTiers(): Promise<TierView[]> {
  const snap = await getDocs(collection(firestore, 'voucherTiers'));
  return snap.docs.map((d) => {
    const data = d.data() as Partial<TierView> & { counts?: Partial<VoucherCounts> };
    return {
      id: d.id,
      provider: String(data.provider ?? ''),
      providerName: String(data.providerName ?? data.provider ?? ''),
      denomination: Number(data.denomination ?? 0),
      pointsCost: Number(data.pointsCost ?? 0),
      active: data.active === true,
      counts: { ...emptyCounts(), ...data.counts },
    };
  });
}

export interface InventoryQuery {
  tierId?: string;
  status?: VoucherStatus;
  startAfterId?: string;
}
export interface InventoryPage {
  items: InventoryItem[];
  nextStartAfterId?: string;
}

export const fetchInventory = (q: InventoryQuery): Promise<InventoryPage> =>
  callFunction('vouchers-listInventory', q);

export const uploadVoucherRows = (rows: UploadRow[]): Promise<UploadResult> =>
  callFunction('vouchers-uploadVouchers', { rows });

export async function changeVoucherStatus(
  voucherId: string,
  status: 'INVALID' | 'REMOVED',
  reason: string,
): Promise<void> {
  await callFunction('vouchers-setVoucherStatus', { voucherId, status, reason });
}

export async function saveTier(input: TierInput): Promise<void> {
  await callFunction('vouchers-upsertTier', input);
}
