// UC #5-3: incident detail with attachments, status update, follow-up deep links and audit trail.
import { Link, useParams } from 'react-router-dom';
import { Alert, ErrorBanner, Spinner } from '../../../design';
import { followUpLinks } from '../controller/incidentRules';
import { useAttachmentUrls, useIncident } from '../controller/useIncidents';
import { PATHS } from '../../../app/paths';
import { reportStrings as s } from '../strings';
import { AuditTrail } from './AuditTrail';
import { StatusBadge } from './StatusBadge';
import { UpdatePanel } from './UpdatePanel';
import type { IncidentView } from '../types';

function Attachments({ incident }: { incident: IncidentView }) {
  const urls = useAttachmentUrls(incident.attachments.map((a) => a.path));
  const d = s.detail;
  return (
    <section aria-labelledby="att-heading" className="stack">
      <h2 id="att-heading">{d.attachments}</h2>
      {incident.attachments.length === 0 ? (
        <p>{d.noAttachments}</p>
      ) : (
        <ul>
          {incident.attachments.map((a, i) => {
            const url = urls[a.path];
            return (
              <li key={a.path}>
                {url ? (
                  <a href={url} target="_blank" rel="noreferrer">
                    {d.openAttachment(i + 1)}
                  </a>
                ) : url === null ? (
                  d.attachmentError
                ) : (
                  <Spinner />
                )}{' '}
                ({a.contentType})
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

export function IncidentDetail() {
  const { id = '' } = useParams();
  const { incident, audit, loading, error, reload } = useIncident(id);
  const d = s.detail;

  return (
    <section className="stack">
      <Link to={PATHS.adminIncidents}>{d.back}</Link>
      <ErrorBanner error={error} onRetry={() => void reload()} />
      {loading && !incident && <Spinner />}
      {!loading && !error && !incident && <Alert tone="warning">{d.notFound}</Alert>}
      {incident && (
        <>
          <h1>{d.heading(incident.id)}</h1>
          <p>
            <StatusBadge status={incident.status} />
          </p>
          <dl>
            <dt>{d.category}</dt>
            <dd>{s.category[incident.category]}</dd>
            <dt>{d.reporter}</dt>
            <dd>{incident.reporterId}</dd>
            <dt>{d.reporterRole}</dt>
            <dd>{incident.reporterRole}</dd>
            <dt>{d.created}</dt>
            <dd>{incident.createdAt?.toLocaleString()}</dd>
            <dt>{d.updated}</dt>
            <dd>{incident.updatedAt?.toLocaleString()}</dd>
            <dt>{d.description}</dt>
            <dd>{incident.description}</dd>
            {incident.infoRequest && (
              <>
                <dt>{d.infoRequest}</dt>
                <dd>{incident.infoRequest}</dd>
              </>
            )}
            {incident.resolution && (
              <>
                <dt>{d.resolution}</dt>
                <dd>{incident.resolution}</dd>
              </>
            )}
          </dl>
          <Attachments incident={incident} />
          <FollowUp incident={incident} />
          <UpdatePanel incident={incident} onUpdated={() => void reload()} />
          <AuditTrail entries={audit} />
        </>
      )}
    </section>
  );
}

function FollowUp({ incident }: { incident: IncidentView }) {
  const links = followUpLinks(incident);
  const f = s.followUp;
  return (
    <section className="stack" aria-labelledby="follow-heading">
      <h2 id="follow-heading">{f.heading}</h2>
      <p>{links.length ? f.help : f.none}</p>
      <ul>
        {links.map((l) => (
          <li key={l.kind}>
            <Link to={l.to}>{l.kind === 'account' ? f.account : f.workshop}</Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
