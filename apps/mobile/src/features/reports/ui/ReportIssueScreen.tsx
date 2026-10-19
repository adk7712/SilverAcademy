// UC #2-5 SubmitUserReport: category, description, optional attachment; shows the reference number; lists my reports.
import {
  AppText,
  Badge,
  Button,
  Card,
  ErrorBanner,
  Screen,
  Select,
  TextField,
} from '../../../design';
import { INCIDENT_CATEGORIES, INCIDENT_DESCRIPTION_MIN } from '@silveracademy/shared';
import { format, strings } from '../../../i18n';
import { pickAttachment } from '../../../services/filePicker';
import { useReportIssue } from '../controller/useReportIssue';
import { maxAttachmentMb } from '../controller/reportLogic';
import { MyReportsList } from './MyReportsList';

const t = strings.reports;

export function ReportIssueScreen() {
  const c = useReportIssue();
  const categoryOptions = INCIDENT_CATEGORIES.map((value) => ({
    value,
    label: t.categories[value],
  }));

  return (
    <Screen title={t.reportTitle}>
      {c.referenceNo ? (
        <Card testID="report-confirmation">
          <AppText variant="title">{t.submittedTitle}</AppText>
          <AppText>{t.referenceLabel}</AppText>
          <AppText variant="display" selectable testID="report-reference">
            {c.referenceNo}
          </AppText>
          <AppText color="textMuted">{t.referenceHint}</AppText>
          <Button label={t.another} variant="secondary" onPress={c.reset} />
        </Card>
      ) : (
        <>
          <AppText color="textMuted">{t.intro}</AppText>
          {c.error ? <ErrorBanner message={c.error} /> : null}
          <Select
            label={t.category}
            options={categoryOptions}
            value={c.category}
            onChange={c.setCategory}
            error={c.fieldErrors.category}
            testID="report-category"
          />
          <TextField
            label={t.description}
            helper={format(t.descriptionHelper, { min: INCIDENT_DESCRIPTION_MIN })}
            value={c.description}
            onChangeText={c.setDescription}
            multiline
            error={c.fieldErrors.description}
            testID="report-description"
          />
          <Card>
            <AppText variant="bodyStrong">{`${t.attach} (${strings.common.fieldOptional})`}</AppText>
            <AppText color="textMuted">{format(t.attachHelper, { mb: maxAttachmentMb })}</AppText>
            {c.attachmentError ? (
              <AppText color="danger" accessibilityRole="alert">
                {c.attachmentError}
              </AppText>
            ) : null}
            {c.attachment ? (
              <>
                <Badge label={format(t.attached, { name: c.attachment.name })} tone="success" />
                <Button label={t.removeAttachment} variant="ghost" onPress={c.clearAttachment} />
              </>
            ) : (
              <Button
                label={t.attach}
                variant="secondary"
                onPress={() => void c.pickFromDevice(pickAttachment)}
                testID="report-attach"
              />
            )}
          </Card>
          <Button
            label={t.submit}
            loading={c.busy}
            onPress={() => void c.submit()}
            testID="report-submit"
          />
        </>
      )}
      <MyReportsList
        reports={c.reports}
        error={c.reportsError}
        onRetry={() => void c.reloadReports()}
      />
    </Screen>
  );
}
