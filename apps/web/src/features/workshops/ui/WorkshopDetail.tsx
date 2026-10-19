// UC #5-2 ManageWorkshops: workshop detail, edit, archive / status change / cancel.
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import type { WorkshopAdminAction } from '@silveracademy/shared';
import { PATHS } from '../../../app/paths';
import { useIncidentParam } from '../../../services/useIncidentParam';
import { Alert, Button, EmptyState, ErrorBanner, Spinner, useToast } from '../../../design';
import { formatTimestamp } from '../../../services/formatTimestamp';
import { useWorkshopDetail } from '../controller/useWorkshops';
import {
  availableStatusActions,
  capacityLocked,
  impactedBookings,
} from '../controller/workshopRules';
import { workshopStrings as t } from '../strings';
import { StatusDialog } from './StatusDialog';
import { WorkshopEditForm } from './WorkshopEditForm';
import { WorkshopStatusBadge } from './WorkshopStatusBadge';

export function WorkshopDetail() {
  const { id = '' } = useParams();
  const incident = useIncidentParam();
  const d = useWorkshopDetail(id, incident);
  const toast = useToast();
  const [pending, setPending] = useState<WorkshopAdminAction | null>(null);
  const [editing, setEditing] = useState(false);
  const w = d.workshop;

  if (d.loading && !w) return <Spinner />;
  if (d.error) return <ErrorBanner error={d.error} onRetry={d.reload} />;
  if (!w) return <EmptyState title={t.detail.notFound} />;

  const now = new Date();
  const actions = availableStatusActions(w);
  const dt = (label: string, value: React.ReactNode) => (
    <>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </>
  );

  return (
    <section className="stack">
      <p>
        <Link to="..">{t.list.back}</Link>
      </p>
      <h1>{w.title}</h1>
      {incident && (
        <Alert tone="info">
          {t.detail.linkedIncident(incident)}{' '}
          <Link to={`${PATHS.adminIncidents}/${encodeURIComponent(incident)}`}>
            {t.detail.viewIncident}
          </Link>
        </Alert>
      )}
      <div className="card">
        <h2>{t.detail.summary}</h2>
        <dl>
          {dt(t.detail.status, <WorkshopStatusBadge status={w.status} />)}
          {dt(t.detail.instructor, w.instructorName)}
          {dt(t.detail.category, t.categoryLabels[w.category])}
          {dt(t.detail.description, w.description)}
          {dt(t.detail.materials, w.materials || t.detail.none)}
          {dt(t.detail.capacity, w.capacity)}
          {dt(t.detail.seatsTaken, w.seatsTaken)}
          {dt(t.detail.attended, w.attendedCount)}
          {dt(t.detail.start, w.startAt ? formatTimestamp(w.startAt) : t.list.notScheduled)}
          {dt(t.detail.end, w.endAt ? formatTimestamp(w.endAt) : t.list.notScheduled)}
          {dt(t.detail.venue, w.venue ? `${w.venue.name}, ${w.venue.address}` : t.detail.none)}
          {w.needsVolunteers &&
            dt(
              t.detail.volunteers,
              t.detail.volunteersValue(w.volunteersAssigned, w.volunteerSlots),
            )}
          {w.cancelReason && dt(t.detail.cancelReason, w.cancelReason)}
          {dt(t.detail.updated, formatTimestamp(w.updatedAt))}
        </dl>
      </div>
      <div className="card stack">
        <h2>{t.detail.actions}</h2>
        {actions.length === 0 && <p>{t.detail.noActions}</p>}
        <div className="row">
          {actions.map((a) => (
            <Button
              key={a}
              variant={a === 'CANCELLED' ? 'danger' : 'secondary'}
              onClick={() => setPending(a)}
            >
              {t.actions[a]}
            </Button>
          ))}
          {!editing && <Button onClick={() => setEditing(true)}>{t.detail.edit}</Button>}
        </div>
      </div>
      {editing && (
        <div className="card">
          <WorkshopEditForm
            key={w.version}
            workshop={w}
            capacityLocked={capacityLocked(w, now)}
            busy={d.busy}
            onSave={(form) => d.save(w, form)}
            onSaved={(changed) => {
              toast.show(
                changed ? t.edit.saved : t.edit.nothingChanged,
                changed ? 'success' : 'info',
              );
              setEditing(false);
            }}
          />
        </div>
      )}
      {pending && (
        <StatusDialog
          action={pending}
          workshopTitle={w.title}
          impact={impactedBookings(w, pending, now)}
          busy={d.busy}
          onSubmit={(reason, ack) => d.changeStatus(w, pending, reason, ack)}
          onClose={() => setPending(null)}
          onDone={() => {
            toast.show(t.confirm.done(t.actions[pending]), 'success');
            setPending(null);
          }}
        />
      )}
    </section>
  );
}
