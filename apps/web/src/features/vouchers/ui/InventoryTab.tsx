// UC #5-4: inventory list with masked codes, filters, paging and status actions.
import { useState } from 'react';
import { VOUCHER_STATUSES } from '@silveracademy/shared';
import type { VoucherStatus } from '@silveracademy/shared';
import { Badge, Button, ErrorBanner, SelectField, Table } from '../../../design';
import type { Column } from '../../../design';
import { tierLabel } from '../controller/inventorySummary';
import { useInventory } from '../controller/useVoucherData';
import { voucherStrings as s } from '../strings';
import type { InventoryItem, TierView } from '../types';
import { StatusDialog } from './StatusDialog';

const STATUS_TONE = {
  AVAILABLE: 'success',
  CLAIMED: 'info',
  INVALID: 'danger',
  REMOVED: 'neutral',
} as const;
const fmt = (iso?: string) => (iso ? new Date(iso).toLocaleString() : '');

export function InventoryTab({ tiers, onChanged }: { tiers: TierView[]; onChanged: () => void }) {
  const [tierId, setTierId] = useState('');
  const [status, setStatus] = useState<VoucherStatus | ''>('');
  const [target, setTarget] = useState<{
    item: InventoryItem;
    status: 'INVALID' | 'REMOVED';
  } | null>(null);
  const inv = useInventory({ tierId, status });

  const columns: Column<InventoryItem>[] = [
    { key: 'code', header: s.inventory.code, render: (i) => <code>{i.codeMasked}</code> },
    {
      key: 'tier',
      header: s.inventory.tier,
      render: (i) => `${i.provider} SGD ${i.denomination}`,
      sortValue: (i) => `${i.provider}${i.denomination}`,
    },
    {
      key: 'status',
      header: s.inventory.status,
      render: (i) => <Badge tone={STATUS_TONE[i.status]}>{s.status[i.status]}</Badge>,
      sortValue: (i) => i.status,
    },
    {
      key: 'uploaded',
      header: s.inventory.uploaded,
      render: (i) => fmt(i.uploadedAt),
      sortValue: (i) => i.uploadedAt,
    },
    { key: 'claimed', header: s.inventory.claimed, render: (i) => fmt(i.claimedAt) },
    {
      key: 'action',
      header: s.inventory.action,
      render: (i) =>
        i.status === 'AVAILABLE' ? (
          <div className="row">
            <Button variant="secondary" onClick={() => setTarget({ item: i, status: 'INVALID' })}>
              {s.inventory.markInvalid}
            </Button>
            <Button variant="danger" onClick={() => setTarget({ item: i, status: 'REMOVED' })}>
              {s.inventory.markRemoved}
            </Button>
          </div>
        ) : null,
    },
  ];

  return (
    <div className="stack">
      <div className="row">
        <SelectField
          label={s.inventory.filterTier}
          value={tierId}
          onChange={(e) => setTierId(e.target.value)}
        >
          <option value="">{s.inventory.all}</option>
          {tiers.map((t) => (
            <option key={t.id} value={t.id}>
              {tierLabel(t)}
            </option>
          ))}
        </SelectField>
        <SelectField
          label={s.inventory.filterStatus}
          value={status}
          onChange={(e) => setStatus(e.target.value as VoucherStatus | '')}
        >
          <option value="">{s.inventory.all}</option>
          {VOUCHER_STATUSES.map((st) => (
            <option key={st} value={st}>
              {s.status[st]}
            </option>
          ))}
        </SelectField>
      </div>
      <ErrorBanner error={inv.error} onRetry={inv.reload} />
      <Table
        caption={s.inventory.caption}
        columns={columns}
        rows={inv.items}
        rowKey={(i) => i.voucherId}
        loading={inv.loading && inv.items.length === 0}
        empty={<p>{s.inventory.empty}</p>}
      />
      {inv.hasMore && (
        <Button variant="secondary" onClick={() => void inv.loadMore()} busy={inv.loading}>
          {s.inventory.loadMore}
        </Button>
      )}
      <StatusDialog
        item={target?.item ?? null}
        status={target?.status ?? 'INVALID'}
        onClose={() => setTarget(null)}
        onDone={() => {
          inv.reload();
          onChanged();
        }}
      />
    </div>
  );
}
