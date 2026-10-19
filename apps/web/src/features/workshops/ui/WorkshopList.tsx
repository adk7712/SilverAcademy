// UC #5-2 ManageWorkshops: search, filter and list workshops.
import { Link } from 'react-router-dom';
import { WORKSHOP_CATEGORIES, WORKSHOP_STATUSES } from '@silveracademy/shared';
import type { Workshop, WorkshopCategory, WorkshopStatus } from '@silveracademy/shared';
import { EmptyState, ErrorBanner, SelectField, Table, TextField } from '../../../design';
import type { Column } from '../../../design';
import { formatTimestamp } from '../../../services/formatTimestamp';
import { useWorkshopList } from '../controller/useWorkshops';
import { workshopStrings as t } from '../strings';
import { WorkshopStatusBadge } from './WorkshopStatusBadge';

const columns: Column<Workshop>[] = [
  {
    key: 'title',
    header: t.list.colTitle,
    sortValue: (w) => w.title.toLowerCase(),
    render: (w) => w.title,
  },
  {
    key: 'instructor',
    header: t.list.colInstructor,
    sortValue: (w) => w.instructorName.toLowerCase(),
    render: (w) => w.instructorName,
  },
  { key: 'category', header: t.list.colCategory, render: (w) => t.categoryLabels[w.category] },
  {
    key: 'status',
    header: t.list.colStatus,
    sortValue: (w) => w.status,
    render: (w) => <WorkshopStatusBadge status={w.status} />,
  },
  {
    key: 'start',
    header: t.list.colStart,
    sortValue: (w) => w.startAt?.seconds ?? 0,
    render: (w) => (w.startAt ? formatTimestamp(w.startAt) : t.list.notScheduled),
  },
  {
    key: 'seats',
    header: t.list.colSeats,
    sortValue: (w) => w.seatsTaken,
    render: (w) => t.list.seats(w.seatsTaken, w.capacity),
  },
  {
    key: 'actions',
    header: t.list.colActions,
    render: (w) => (
      <Link className="btn btn--secondary" to={w.id} aria-label={t.list.openFor(w.title)}>
        {t.list.open}
      </Link>
    ),
  },
];

export function WorkshopList() {
  const w = useWorkshopList();
  return (
    <section className="stack">
      <h1>{t.list.title}</h1>
      <div className="row" role="search">
        <TextField
          label={t.list.searchLabel}
          value={w.filters.query}
          onChange={(e) => w.setFilters({ ...w.filters, query: e.target.value })}
        />
        <SelectField
          label={t.list.statusFilter}
          value={w.filters.status}
          onChange={(e) =>
            w.setFilters({ ...w.filters, status: e.target.value as WorkshopStatus | '' })
          }
        >
          <option value="">{t.list.all}</option>
          {WORKSHOP_STATUSES.map((s) => (
            <option key={s} value={s}>
              {t.statusLabels[s]}
            </option>
          ))}
        </SelectField>
        <SelectField
          label={t.list.categoryFilter}
          value={w.filters.category}
          onChange={(e) =>
            w.setFilters({ ...w.filters, category: e.target.value as WorkshopCategory | '' })
          }
        >
          <option value="">{t.list.all}</option>
          {WORKSHOP_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {t.categoryLabels[c]}
            </option>
          ))}
        </SelectField>
      </div>
      <ErrorBanner error={w.error} onRetry={w.reload} />
      <Table
        caption={t.list.tableCaption}
        columns={columns}
        rows={w.rows}
        rowKey={(r) => r.id}
        loading={w.loading}
        empty={<EmptyState title={t.list.emptyTitle} description={t.list.emptyDescription} />}
      />
    </section>
  );
}
