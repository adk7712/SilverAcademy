// UC #5-4: stock summary grouped by provider / denomination / status (from voucherTiers.counts).
import { VOUCHER_STATUSES } from '@silveracademy/shared';
import { Badge, EmptyState, ErrorBanner, Table } from '../../../design';
import type { Column } from '../../../design';
import { groupByProvider, totalOf } from '../controller/inventorySummary';
import { voucherStrings as s } from '../strings';
import type { TierView } from '../types';

interface Props {
  tiers: TierView[];
  loading: boolean;
  error: unknown;
  onRetry: () => void;
}

export function SummaryTab({ tiers, loading, error, onRetry }: Props) {
  const groups = groupByProvider(tiers);
  const rows = groups.flatMap((g) => g.tiers);
  const columns: Column<TierView>[] = [
    {
      key: 'provider',
      header: s.summary.provider,
      render: (t) => t.providerName,
      sortValue: (t) => t.providerName,
    },
    {
      key: 'denomination',
      header: s.summary.denomination,
      render: (t) => s.summary.money(t.denomination),
      sortValue: (t) => t.denomination,
    },
    ...VOUCHER_STATUSES.map((st) => ({
      key: st,
      header: s.status[st],
      render: (t: TierView) => t.counts[st],
      sortValue: (t: TierView) => t.counts[st],
    })),
    {
      key: 'total',
      header: s.summary.total,
      render: (t) => totalOf(t.counts),
      sortValue: (t) => totalOf(t.counts),
    },
    {
      key: 'active',
      header: s.summary.active,
      render: (t) => (
        <Badge tone={t.active ? 'success' : 'neutral'}>
          {t.active ? s.summary.active : s.summary.inactive}
        </Badge>
      ),
    },
  ];
  return (
    <div className="stack">
      <ErrorBanner error={error} onRetry={onRetry} />
      <Table
        caption={s.summary.caption}
        columns={columns}
        rows={rows}
        rowKey={(t) => t.id}
        loading={loading}
        empty={<EmptyState title={s.summary.empty} />}
      />
    </div>
  );
}
