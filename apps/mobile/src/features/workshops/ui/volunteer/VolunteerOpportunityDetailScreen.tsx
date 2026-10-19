// UC #3-2 AssistWorkshop: details, opt in (with confirmation), already-opted-in status, withdraw.
import { View } from 'react-native';
import {
  AppText,
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorBanner,
  LoadingState,
  Screen,
  useTheme,
} from '../../../../design';
import { format, strings } from '../../../../i18n';
import { useAppRoute } from '../../../../navigation';
import { formatWhen } from '../../controller/formatWhen';
import { useOpportunityDetail } from '../../controller/useOpportunityDetail';
import { volunteerPlacesLeft } from '../../controller/volunteerLogic';
import type { DetailAction } from '../../volunteerTypes';

const t = strings.workshopsVolunteer;
const BLOCKED_TEXT: Partial<Record<DetailAction, string>> = {
  FULL: t.full,
  NOT_ACCEPTING: t.notAccepting,
  STARTED: t.started,
};

export function VolunteerOpportunityDetailScreen() {
  const { workshopId } = useAppRoute<'OpportunityDetail'>().params;
  const { spacing } = useTheme();
  const c = useOpportunityDetail(workshopId);
  const w = c.workshop;

  return (
    <Screen title={strings.workshops.opportunityDetailTitle}>
      {c.loading ? <LoadingState /> : null}
      {c.error ? <ErrorBanner message={c.error} onRetry={() => void c.reload()} /> : null}
      {!c.loading && !w && !c.error ? <EmptyState title={t.notFound} /> : null}
      {w ? (
        <>
          <Card>
            <AppText variant="heading">{w.title}</AppText>
            <AppText>{format(t.instructor, { name: w.instructorName })}</AppText>
            <AppText color="textMuted">{formatWhen(w.startAt, w.endAt)}</AppText>
            <AppText color="textMuted">
              {w.venue ? `${w.venue.name}, ${w.venue.address}` : t.venueTbc}
            </AppText>
            <AppText>{w.description}</AppText>
            {w.materials ? (
              <AppText color="textMuted">{`${t.materials}: ${w.materials}`}</AppText>
            ) : null}
            <Badge
              label={format(t.slotsLeft, {
                left: volunteerPlacesLeft(w),
                total: w.volunteerSlots,
              })}
              tone="info"
            />
          </Card>
          {c.assignment ? (
            <Badge
              label={format(t.statusLine, { status: t.status[c.assignment.status] })}
              tone={c.assignment.status === 'ASSIGNED' ? 'success' : 'neutral'}
            />
          ) : null}
          {c.notice ? <AppText variant="bodyStrong">{c.notice}</AppText> : null}
          {c.confirming ? (
            <Card>
              <AppText variant="title">
                {c.confirming === 'ASSIST' ? t.assistConfirmTitle : t.withdrawConfirmTitle}
              </AppText>
              <View style={{ gap: spacing.sm }}>
                <Button
                  label={c.confirming === 'ASSIST' ? t.assistConfirm : t.withdrawConfirm}
                  variant={c.confirming === 'ASSIST' ? 'primary' : 'danger'}
                  loading={c.busy}
                  onPress={() => void c.confirm()}
                  testID="confirm-action"
                />
                <Button
                  label={t.assistCancel}
                  variant="secondary"
                  disabled={c.busy}
                  onPress={c.cancelConfirm}
                />
              </View>
            </Card>
          ) : null}
          {!c.confirming && c.action === 'ASSIST' ? (
            <Button label={t.assistWorkshop} onPress={c.askAssist} testID="assist" />
          ) : null}
          {!c.confirming && c.action === 'WITHDRAW' ? (
            <Button label={t.withdraw} variant="danger" onPress={c.askWithdraw} testID="withdraw" />
          ) : null}
          {c.action && BLOCKED_TEXT[c.action] && !c.confirming ? (
            <AppText color="textMuted" variant="bodyStrong">
              {BLOCKED_TEXT[c.action]}
            </AppText>
          ) : null}
        </>
      ) : null}
    </Screen>
  );
}
