// UC #5-3 / #5-1: read-only audit trail of one incident.
import { DEFAULT_PAGE_SIZE, Table } from '../../../design';
import type { Column } from '../../../design';
import { reportStrings as s } from '../strings';
import type { AuditEntryView } from '../types';

const AUDIT_PAGE_SIZE = DEFAULT_PAGE_SIZE;

const detailsText = (d: AuditEntryView['details']): string =>
  Object.entries(d)
    .map(([k, v]) => `${k}: ${String(v)}`)
    .join(', ');

export function AuditTrail({ entries }: { entries: AuditEntryView[] }) {
  const a = s.audit;
  const columns: Column<AuditEntryView>[] = [
    {
      key: 'when',
      header: a.when,
      render: (e) => e.createdAt?.toLocaleString() ?? '',
      sortValue: (e) => e.createdAt?.getTime() ?? 0,
    },
    { key: 'actor', header: a.actor, render: (e) => e.actorId ?? a.system },
    { key: 'action', header: a.action, render: (e) => e.action, sortValue: (e) => e.action },
    { key: 'outcome', header: a.outcome, render: (e) => e.outcome },
    { key: 'details', header: a.details, render: (e) => detailsText(e.details) },
  ];
  return (
    <section className="stack" aria-labelledby="audit-heading">
      <h2 id="audit-heading">{a.heading}</h2>
      <Table
        caption={a.caption}
        columns={columns}
        rows={entries}
        rowKey={(e) => e.id}
        pageSize={AUDIT_PAGE_SIZE}
        empty={<p>{a.empty}</p>}
      />
    </section>
  );
}
