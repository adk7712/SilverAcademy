// UC #5-4: group voucher tiers by provider/denomination with status totals (pure).
import type { VoucherCounts, VoucherStatus } from '@silveracademy/shared';
import { VOUCHER_STATUSES } from '@silveracademy/shared';
import type { TierView } from '../types';

export const emptyCounts = (): VoucherCounts => ({
  AVAILABLE: 0,
  CLAIMED: 0,
  INVALID: 0,
  REMOVED: 0,
});

export const totalOf = (c: VoucherCounts): number =>
  VOUCHER_STATUSES.reduce((sum: number, s: VoucherStatus) => sum + c[s], 0);

export interface ProviderGroup {
  provider: string;
  providerName: string;
  tiers: TierView[];
  totals: VoucherCounts;
}

/** Providers sorted by name; tiers within a provider by denomination. */
export function groupByProvider(tiers: readonly TierView[]): ProviderGroup[] {
  const map = new Map<string, ProviderGroup>();
  for (const t of tiers) {
    const g = map.get(t.provider) ?? {
      provider: t.provider,
      providerName: t.providerName,
      tiers: [],
      totals: emptyCounts(),
    };
    g.tiers.push(t);
    for (const s of VOUCHER_STATUSES) g.totals[s] += t.counts[s];
    map.set(t.provider, g);
  }
  return [...map.values()]
    .map((g) => ({ ...g, tiers: [...g.tiers].sort((a, b) => a.denomination - b.denomination) }))
    .sort((a, b) => a.providerName.localeCompare(b.providerName));
}

export const activeTierIds = (tiers: readonly TierView[]): Set<string> =>
  new Set(tiers.filter((t) => t.active).map((t) => t.id));

export const tierLabel = (t: Pick<TierView, 'providerName' | 'denomination'>): string =>
  `${t.providerName} SGD ${t.denomination}`;
