// UC #5-4 ManageVoucherInventory: summary, inventory list, upload and tier management for Admin.
import { useState } from 'react';
import { ErrorBanner, Spinner } from '../../../design';
import { useTiers } from '../controller/useVoucherData';
import { voucherStrings as s } from '../strings';
import { InventoryTab } from './InventoryTab';
import { SummaryTab } from './SummaryTab';
import { TiersTab } from './TiersTab';
import { UploadTab } from './UploadTab';

const TABS = ['summary', 'inventory', 'upload', 'tiers'] as const;
type Tab = (typeof TABS)[number];

export function VoucherInventoryPage() {
  const [tab, setTab] = useState<Tab>('summary');
  const { tiers, loading, error, reload } = useTiers();

  return (
    <section className="stack">
      <h1>{s.title}</h1>
      <div className="row" role="group" aria-label={s.title}>
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            className={`btn btn--${tab === t ? 'primary' : 'secondary'}`}
            aria-pressed={tab === t}
            onClick={() => setTab(t)}
          >
            {s.tabs[t]}
          </button>
        ))}
      </div>
      {tab === 'summary' && (
        <SummaryTab tiers={tiers} loading={loading} error={error} onRetry={() => void reload()} />
      )}
      {tab !== 'summary' && (
        <>
          <ErrorBanner error={error} onRetry={() => void reload()} />
          {loading && tiers.length === 0 && <Spinner />}
        </>
      )}
      {tab === 'inventory' && <InventoryTab tiers={tiers} onChanged={() => void reload()} />}
      {tab === 'upload' && <UploadTab tiers={tiers} onUploaded={() => void reload()} />}
      {tab === 'tiers' && <TiersTab tiers={tiers} onSaved={() => void reload()} />}
    </section>
  );
}
