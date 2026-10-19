// UC #2-5 "my reports": reference numbers with status so a report stays trackable.
import { AppText, Badge, Card, ErrorBanner, type BadgeTone } from '../../../design';
import { format, strings } from '../../../i18n';
import type { MyReport } from '../reportTypes';

const t = strings.reports;
const TONE: Record<MyReport['status'], BadgeTone> = {
  SUBMITTED: 'info',
  UNDER_REVIEW: 'info',
  AWAITING_INFO: 'warning',
  RESOLVED: 'success',
  CLOSED: 'neutral',
};

export function MyReportsList({
  reports,
  error,
  onRetry,
}: {
  reports: MyReport[];
  error: string | null;
  onRetry: () => void;
}) {
  return (
    <>
      <AppText variant="title">{t.myReports}</AppText>
      {error ? <ErrorBanner message={error} onRetry={onRetry} /> : null}
      {!error && reports.length === 0 ? (
        <AppText color="textMuted">{t.myReportsEmpty}</AppText>
      ) : null}
      {reports.map((r) => (
        <Card key={r.referenceNo} testID={`report-${r.referenceNo}`}>
          <AppText variant="bodyStrong" selectable>
            {r.referenceNo}
          </AppText>
          <AppText color="textMuted">{t.categories[r.category]}</AppText>
          <Badge label={t.status[r.status]} tone={TONE[r.status]} />
          {r.infoRequest ? (
            <AppText>{format(t.infoRequested, { text: r.infoRequest })}</AppText>
          ) : null}
          {r.resolution ? <AppText>{format(t.resolution, { text: r.resolution })}</AppText> : null}
        </Card>
      ))}
    </>
  );
}
