// UC #3-3 Class roster: registered learners with attended status, pull-to-refresh button.
import { View } from 'react-native';
import {
  AppText,
  Screen,
  useTheme,
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorBanner,
  ListItem,
  LoadingState,
} from '../../../design';
import { format, strings } from '../../../i18n';
import { useAppNavigation, useAppRoute } from '../../../navigation';
import { countAttended, isAttended } from '../controller/rosterLogic';
import { useRoster } from '../controller/useRoster';

const s = strings.bookingsRoster;

export function RosterScreen() {
  const { workshopId } = useAppRoute<'Roster'>().params;
  const navigation = useAppNavigation();
  const { spacing } = useTheme();
  const { roster, error, refreshing, refresh } = useRoster(workshopId);

  return (
    <Screen title={strings.bookings.rosterTitle}>
      {error ? <ErrorBanner message={error} onRetry={refresh} /> : null}
      {!roster && !error ? <LoadingState /> : null}
      {roster ? (
        <View style={{ gap: spacing.md }}>
          <Card>
            <AppText variant="title">{roster.workshop.title}</AppText>
            <AppText variant="bodyStrong">
              {format(s.summary, {
                attended: countAttended(roster.learners),
                total: roster.learners.length,
              })}
            </AppText>
            <AppText color="textMuted">
              {format(s.capacity, {
                taken: roster.workshop.seatsTaken,
                capacity: roster.workshop.capacity,
              })}
            </AppText>
          </Card>
          <Button
            label={s.scanButton}
            onPress={() => navigation.navigate('ScanAttendance', { workshopId })}
          />
          <Button label={s.refresh} variant="secondary" onPress={refresh} loading={refreshing} />
          <AppText variant="title">{s.learnersTitle}</AppText>
          {roster.learners.length === 0 ? (
            <EmptyState title={s.empty} message={s.emptyHint} />
          ) : (
            roster.learners.map((l) => (
              <ListItem
                key={l.bookingId}
                title={l.learnerName}
                subtitle={
                  isAttended(l) && l.attendedAt
                    ? format(s.attendedAt, { time: new Date(l.attendedAt).toLocaleTimeString() })
                    : undefined
                }
                right={
                  <Badge
                    label={isAttended(l) ? s.attended : s.registered}
                    tone={isAttended(l) ? 'success' : 'neutral'}
                  />
                }
              />
            ))
          )}
          {roster.volunteers.length > 0 ? (
            <>
              <AppText variant="title">{s.volunteersTitle}</AppText>
              {roster.volunteers.map((v) => (
                <ListItem key={v.volunteerId} title={v.volunteerName} />
              ))}
            </>
          ) : null}
        </View>
      ) : null}
    </Screen>
  );
}
