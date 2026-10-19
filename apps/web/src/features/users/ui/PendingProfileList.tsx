// UC #5-5 pending instructor profiles, oldest first.
import { Link } from 'react-router-dom';
import type { InstructorProfile } from '@silveracademy/shared';
import { EmptyState, ErrorBanner, Table } from '../../../design';
import type { Column } from '../../../design';
import { formatTimestamp } from '../../../services/formatTimestamp';
import { usePendingProfiles } from '../controller/useInstructorReview';
import { userStrings as t } from '../strings';

const columns: Column<InstructorProfile>[] = [
  {
    key: 'name',
    header: t.review.colName,
    sortValue: (p) => p.displayName.toLowerCase(),
    render: (p) => p.displayName,
  },
  {
    key: 'expertise',
    header: t.review.colExpertise,
    render: (p) => p.expertise.map((c) => t.categoryLabels[c]).join(', '),
  },
  {
    key: 'exp',
    header: t.review.colExperience,
    sortValue: (p) => p.experienceYears,
    render: (p) => t.review.years(p.experienceYears),
  },
  {
    key: 'submitted',
    header: t.review.colSubmitted,
    sortValue: (p) => p.submittedAt.seconds,
    render: (p) => formatTimestamp(p.submittedAt),
  },
  {
    key: 'actions',
    header: t.review.colActions,
    render: (p) => (
      <Link
        className="btn btn--secondary"
        to={p.uid}
        aria-label={t.review.reviewFor(p.displayName)}
      >
        {t.review.review}
      </Link>
    ),
  },
];

export function PendingProfileList() {
  const p = usePendingProfiles();
  return (
    <section className="stack">
      <h1>{t.review.title}</h1>
      <p>{t.review.intro}</p>
      <ErrorBanner error={p.error} onRetry={p.reload} />
      <Table
        caption={t.review.tableCaption}
        columns={columns}
        rows={p.rows}
        rowKey={(r) => r.uid}
        loading={p.loading}
        empty={<EmptyState title={t.review.emptyTitle} description={t.review.emptyDescription} />}
      />
    </section>
  );
}
