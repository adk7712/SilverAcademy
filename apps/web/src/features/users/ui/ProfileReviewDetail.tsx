// UC #5-5 review one instructor profile: Approve / Reject / Request revision.
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import type { InstructorProfile, InstructorReviewDecision } from '@silveracademy/shared';
import { Alert, Button, EmptyState, ErrorBanner, Spinner, useToast } from '../../../design';
import { decisionNeedsReason } from '../controller/accountRules';
import { formatTimestamp } from '../../../services/formatTimestamp';
import { useProfile, useProfileDecision } from '../controller/useInstructorReview';
import { userStrings as t } from '../strings';
import { ReasonDialog } from './ReasonDialog';

export function ProfileReviewDetail() {
  const { uid = '' } = useParams();
  const load = useProfile(uid);
  if (load.loading && !load.data) return <Spinner />;
  if (load.error) return <ErrorBanner error={load.error} onRetry={load.reload} />;
  if (!load.data) return <EmptyState title={t.review.notFound} />;
  return <Review profile={load.data} reload={load.reload} />;
}

function Review({ profile, reload }: { profile: InstructorProfile; reload: () => void }) {
  const toast = useToast();
  const navigate = useNavigate();
  const [pending, setPending] = useState<InstructorReviewDecision | null>(null);
  const { busy, decide } = useProfileDecision(profile, reload);
  const isPending = profile.status === 'PENDING';

  const title = (d: InstructorReviewDecision) =>
    d === 'APPROVE'
      ? t.review.approveTitle(profile.displayName)
      : d === 'REJECT'
        ? t.review.rejectTitle(profile.displayName)
        : t.review.revisionTitle(profile.displayName);
  const label = (d: InstructorReviewDecision) =>
    d === 'APPROVE'
      ? t.review.approve
      : d === 'REJECT'
        ? t.review.reject
        : t.review.requestRevision;

  return (
    <section className="stack">
      <p>
        <Link to="..">{t.review.back}</Link>
      </p>
      <h1>{profile.displayName}</h1>
      <div className="card">
        <dl>
          <dt>{t.review.bio}</dt>
          <dd>{profile.bio}</dd>
          <dt>{t.review.expertise}</dt>
          <dd>{profile.expertise.map((c) => t.categoryLabels[c]).join(', ')}</dd>
          <dt>{t.review.experience}</dt>
          <dd>{t.review.years(profile.experienceYears)}</dd>
          <dt>{t.review.submitted}</dt>
          <dd>{formatTimestamp(profile.submittedAt)}</dd>
        </dl>
      </div>
      {isPending ? (
        <div className="row">
          <Button onClick={() => setPending('APPROVE')}>{t.review.approve}</Button>
          <Button variant="danger" onClick={() => setPending('REJECT')}>
            {t.review.reject}
          </Button>
          <Button variant="secondary" onClick={() => setPending('REQUEST_REVISION')}>
            {t.review.requestRevision}
          </Button>
        </div>
      ) : (
        <Alert tone="info">{t.review.notPending}</Alert>
      )}
      {pending && (
        <ReasonDialog
          title={title(pending)}
          message={pending === 'APPROVE' ? t.review.approveMessage : null}
          confirmLabel={label(pending)}
          tone={pending === 'REJECT' ? 'danger' : 'primary'}
          askReason={decisionNeedsReason(pending)}
          reasonRequired={decisionNeedsReason(pending)}
          reasonLabel={t.review.reasonLabel}
          reasonHint={t.review.reasonHint}
          busy={busy}
          onSubmit={(reason) => decide(pending, reason)}
          onClose={() => setPending(null)}
          onDone={() => {
            toast.show(t.review.decided[pending], 'success');
            setPending(null);
            navigate('..');
          }}
        />
      )}
    </section>
  );
}
