// UC #3-3 ViewAssigned: assigned workshops with details and the registered-learner list (assigned volunteers only).
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
import { useAppNavigation } from '../../../../navigation';
import { formatWhen } from '../../controller/formatWhen';
import { useAssignedWorkshops } from '../../controller/useAssignedWorkshops';
import { assignedPhase } from '../../controller/volunteerLogic';
import { RosterList } from './RosterList';

const t = strings.workshopsVolunteer;
const PHASE_TEXT = {
  UPCOMING: t.upcoming,
  COMPLETED: t.completed,
  CANCELLED: t.cancelled,
} as const;
const PHASE_TONE = { UPCOMING: 'info', COMPLETED: 'neutral', CANCELLED: 'danger' } as const;

export function AssignedWorkshopsScreen() {
  const navigation = useAppNavigation();
  const { spacing } = useTheme();
  const c = useAssignedWorkshops();
  const now = new Date();

  return (
    <Screen title={strings.workshops.assignedTitle}>
      <Button
        label={t.scanShortcut}
        variant="secondary"
        onPress={() => navigation.navigate('ScanTab')}
        testID="scan-shortcut"
      />
      {c.loading ? <LoadingState /> : null}
      {c.error ? <ErrorBanner message={c.error} onRetry={() => void c.reload()} /> : null}
      {!c.loading && !c.error && c.workshops.length === 0 ? (
        <EmptyState title={t.assignedEmpty} message={t.assignedEmptyBody} />
      ) : null}
      {c.workshops.map((w) => {
        const phase = assignedPhase(w, now);
        const open = c.openId === w.id;
        return (
          <Card key={w.id} testID={`assigned-${w.id}`}>
            <AppText variant="title">{w.title}</AppText>
            <Badge label={PHASE_TEXT[phase]} tone={PHASE_TONE[phase]} />
            <AppText color="textMuted">{formatWhen(w.startAt, w.endAt)}</AppText>
            <AppText color="textMuted">
              {w.venue ? `${w.venue.name}, ${w.venue.address}` : t.venueTbc}
            </AppText>
            <Button
              label={open ? t.hideDetails : t.showDetails}
              variant="secondary"
              onPress={() => c.toggle(w.id)}
            />
            {open ? (
              <View style={{ gap: spacing.sm }}>
                <AppText>{w.description}</AppText>
                <AppText color="textMuted">
                  {format(t.instructor, { name: w.instructorName })}
                </AppText>
                {w.materials ? (
                  <AppText color="textMuted">{`${t.materials}: ${w.materials}`}</AppText>
                ) : null}
                <RosterList state={c.rosters[w.id]} onRetry={() => void c.loadRoster(w.id)} />
              </View>
            ) : null}
          </Card>
        );
      })}
    </Screen>
  );
}
