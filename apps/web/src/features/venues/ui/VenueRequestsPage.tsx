// UC #4-2 ApproveVenueRequests: pending queue, history, request detail with decisions.
import { useState } from 'react';
import { Badge, Button, EmptyState, ErrorBanner, Table } from '../../../design';
import type { Column } from '../../../design';
import { requestLabel, requestTone } from '../controller/requestRules';
import { formatDateTime } from '../controller/slotRules';
import { useVenueRequests } from '../controller/useVenueRequests';
import { venueStrings } from '../strings';
import type { RequestView } from '../types';
import { RequestDetail } from './RequestDetail';

export function VenueRequestsPage() {
  const r = venueStrings.requests;
  const requests = useVenueRequests();
  const [openId, setOpenId] = useState<string | null>(null);
  const current = requests.data.find((x) => x.id === openId) ?? null;

  const columns: Column<RequestView>[] = [
    {
      key: 'workshop',
      header: r.workshop,
      render: (x) => x.workshopTitle,
      sortValue: (x) => x.workshopTitle,
    },
    {
      key: 'instructor',
      header: r.instructor,
      render: (x) => x.instructorName,
      sortValue: (x) => x.instructorName,
    },
    {
      key: 'venue',
      header: r.venue,
      render: (x) => x.facilityName,
      sortValue: (x) => x.facilityName,
    },
    {
      key: 'when',
      header: r.date,
      render: (x) => formatDateTime(x.startMs),
      sortValue: (x) => x.startMs,
    },
    {
      key: 'status',
      header: r.status,
      render: (x) => <Badge tone={requestTone(x.status)}>{requestLabel(x.status)}</Badge>,
    },
    {
      key: 'view',
      header: r.view,
      render: (x) => (
        <Button variant="secondary" onClick={() => setOpenId(x.id)}>
          {r.view}
          <span className="sr-only">: {x.workshopTitle}</span>
        </Button>
      ),
    },
  ];

  if (current) {
    return (
      <RequestDetail
        key={current.id}
        request={current}
        onBack={() => setOpenId(null)}
        onDecide={(action, result) => requests.decide({ requestId: current.id, action, ...result })}
      />
    );
  }

  return (
    <section className="stack">
      <div className="row">
        <h1>{r.title}</h1>
        <Button variant="secondary" onClick={requests.reload}>
          {r.refresh}
        </Button>
      </div>
      <p>{r.intro}</p>
      <ErrorBanner error={requests.error} onRetry={requests.reload} />
      <h2>{r.pending}</h2>
      <Table
        caption={r.pending}
        columns={columns}
        rows={requests.queues.open}
        rowKey={(x) => x.id}
        loading={requests.loading}
        empty={<EmptyState title={r.noPending} description={r.noPendingHint} />}
      />
      <h2>{r.history}</h2>
      <Table
        caption={r.history}
        columns={columns}
        rows={requests.queues.history}
        rowKey={(x) => x.id}
        loading={requests.loading}
        empty={<EmptyState title={r.noHistory} description="" />}
      />
    </section>
  );
}
