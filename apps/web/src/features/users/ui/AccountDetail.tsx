// UC #5-1 ManageAccounts: account detail with Flag / Suspend / Reactivate.
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import type { AccountAction } from '@silveracademy/shared';
import { Alert, Badge, Button, EmptyState, ErrorBanner, Spinner, useToast } from '../../../design';
import { actionNeedsReason, availableActions, isAdminAccount } from '../controller/accountRules';
import { formatTimestamp } from '../../../services/formatTimestamp';
import { PATHS } from '../../../app/paths';
import { useIncidentParam } from '../../../services/useIncidentParam';
import { useAccountDetail } from '../controller/useAccounts';
import { userStrings as t } from '../strings';
import { AccountStatusBadge } from './AccountStatusBadge';
import { ReasonDialog } from './ReasonDialog';

export function AccountDetail() {
  const { uid = '' } = useParams();
  const d = useAccountDetail(uid);
  const toast = useToast();
  const incident = useIncidentParam();
  const [pending, setPending] = useState<AccountAction | null>(null);
  const u = d.user;

  if (d.loading && !u) return <Spinner />;
  if (d.error) return <ErrorBanner error={d.error} onRetry={d.reload} />;
  if (!u) return <EmptyState title={t.detail.notFound} />;

  const actions = availableActions(u);
  const dt = (label: string, value: React.ReactNode) => (
    <>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </>
  );

  return (
    <section className="stack">
      <p>
        <Link to="..">{t.accounts.back}</Link>
      </p>
      <h1>{u.displayName}</h1>
      {incident && (
        <Alert tone="info">
          {t.detail.linkedIncident(incident)}{' '}
          <Link to={`${PATHS.adminIncidents}/${encodeURIComponent(incident)}`}>
            {t.detail.viewIncident}
          </Link>
        </Alert>
      )}
      <div className="card">
        <h2>{t.detail.profile}</h2>
        <dl>
          {dt(t.detail.roles, u.roles.map((r) => t.roleLabels[r]).join(', '))}
          {dt(t.detail.status, <AccountStatusBadge status={u.status} />)}
          {dt(
            t.detail.flag,
            u.flagged ? <Badge tone="warning">{t.accounts.flagged}</Badge> : t.detail.no,
          )}
          {u.flagReason && dt(t.detail.flagReason, u.flagReason)}
          {u.orgName && dt(t.detail.organisation, u.orgName)}
          {dt(t.detail.authType, u.authType)}
          {dt(t.detail.seniorEligible, u.seniorEligible ? t.detail.yes : t.detail.no)}
          {dt(t.detail.created, formatTimestamp(u.createdAt))}
          {dt(t.detail.updated, formatTimestamp(u.updatedAt))}
        </dl>
      </div>
      {d.profile && (
        <div className="card">
          <h2>{t.detail.instructorProfile}</h2>
          <p>{d.profile.bio}</p>
          <p>{d.profile.expertise.map((c) => t.categoryLabels[c]).join(', ')}</p>
        </div>
      )}
      <div className="card stack">
        <h2>{t.detail.actions}</h2>
        {isAdminAccount(u) && <Alert tone="info">{t.detail.adminProtected}</Alert>}
        {!isAdminAccount(u) && actions.length === 0 && <p>{t.detail.noActions}</p>}
        <div className="row">
          {actions.map((a) => (
            <Button
              key={a}
              variant={a === 'SUSPEND' ? 'danger' : 'secondary'}
              onClick={() => setPending(a)}
            >
              {t.actions[a]}
            </Button>
          ))}
        </div>
      </div>
      {pending && (
        <ReasonDialog
          title={t.confirm.title(t.actions[pending], u.displayName)}
          message={t.confirm[pending]}
          confirmLabel={t.confirm.submit}
          tone={pending === 'SUSPEND' ? 'danger' : 'primary'}
          askReason
          reasonRequired={actionNeedsReason(pending)}
          busy={d.busy}
          onSubmit={(reason) => d.act(pending, reason)}
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
