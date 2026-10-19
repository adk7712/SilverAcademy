// UC #5-3: incident queue table with status filter.
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { INCIDENT_STATUSES } from '@silveracademy/shared';
import type { IncidentStatus } from '@silveracademy/shared';
import { ErrorBanner, SelectField, Table } from '../../../design';
import type { Column } from '../../../design';
import { incidentPath } from '../controller/incidentRules';
import { useIncidentList } from '../controller/useIncidents';
import { INCIDENT_PAGE_SIZE } from '../controller/incidentActions';
import { reportStrings as s } from '../strings';
import type { IncidentView } from '../types';
import { StatusBadge } from './StatusBadge';

export function IncidentList() {
  const [status, setStatus] = useState<IncidentStatus | ''>('');
  const { items, loading, error, reload } = useIncidentList(status);

  const columns: Column<IncidentView>[] = [
    { key: 'ref', header: s.list.ref, render: (i) => i.id, sortValue: (i) => i.id },
    {
      key: 'category',
      header: s.list.category,
      render: (i) => s.category[i.category],
      sortValue: (i) => i.category,
    },
    {
      key: 'status',
      header: s.list.status,
      render: (i) => <StatusBadge status={i.status} />,
      sortValue: (i) => i.status,
    },
    { key: 'role', header: s.list.reportedBy, render: (i) => i.reporterRole },
    {
      key: 'created',
      header: s.list.created,
      render: (i) => i.createdAt?.toLocaleString() ?? '',
      sortValue: (i) => i.createdAt?.getTime() ?? 0,
    },
    {
      key: 'open',
      header: s.list.open,
      render: (i) => (
        <Link to={incidentPath(i.id)}>
          {s.list.open} {i.id}
        </Link>
      ),
    },
  ];

  return (
    <section className="stack">
      <h1>{s.title}</h1>
      <SelectField
        label={s.list.filterStatus}
        value={status}
        onChange={(e) => setStatus(e.target.value as IncidentStatus | '')}
      >
        <option value="">{s.list.all}</option>
        {INCIDENT_STATUSES.map((st) => (
          <option key={st} value={st}>
            {s.status[st]}
          </option>
        ))}
      </SelectField>
      <ErrorBanner error={error} onRetry={() => void reload()} />
      <Table
        caption={s.list.caption}
        columns={columns}
        rows={items}
        rowKey={(i) => i.id}
        loading={loading}
        empty={<p>{s.list.empty}</p>}
      />
      {items.length >= INCIDENT_PAGE_SIZE && <p>{s.list.loadHint(INCIDENT_PAGE_SIZE)}</p>}
    </section>
  );
}
