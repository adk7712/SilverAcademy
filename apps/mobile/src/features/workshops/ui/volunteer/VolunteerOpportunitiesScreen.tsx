// UC #3-1 ViewWorkshops: workshops needing volunteers, nearest first when location is allowed.
import { View } from 'react-native';
import {
  AppText,
  Badge,
  Button,
  EmptyState,
  ErrorBanner,
  ListItem,
  LoadingState,
  Screen,
  useTheme,
} from '../../../../design';
import { format, strings } from '../../../../i18n';
import { useAppNavigation } from '../../../../navigation';
import { formatWhen } from '../../controller/formatWhen';
import { formatDistanceKm, volunteerPlacesLeft } from '../../controller/volunteerLogic';
import { useVolunteerOpportunities } from '../../controller/useVolunteerOpportunities';

const t = strings.workshopsVolunteer;

export function VolunteerOpportunitiesScreen() {
  const navigation = useAppNavigation();
  const { spacing } = useTheme();
  const c = useVolunteerOpportunities();
  const { list } = c;

  return (
    <Screen title={strings.workshops.opportunitiesTitle}>
      {c.error ? <ErrorBanner message={c.error} onRetry={() => void c.reload()} /> : null}
      {c.locationDenied ? (
        <View style={{ gap: spacing.sm }}>
          <AppText color="textMuted">{t.locationDenied}</AppText>
          <Button
            label={t.useLocation}
            variant="secondary"
            onPress={() => void c.retryLocation()}
          />
        </View>
      ) : null}
      {list.mode !== 'UNORDERED' ? (
        <Button
          label={c.viewAll ? t.viewNearby : t.viewAll}
          variant="secondary"
          onPress={c.toggleViewAll}
          testID="toggle-view-all"
        />
      ) : null}
      {c.loading ? <LoadingState /> : null}
      {!c.loading && list.noNearby ? (
        <EmptyState
          title={t.noNearby}
          message={t.noNearbyBody}
          actionLabel={t.viewAll}
          onAction={c.toggleViewAll}
        />
      ) : null}
      {!c.loading && list.items.length === 0 && !list.noNearby && !c.error ? (
        <EmptyState title={t.noOpportunities} message={t.noOpportunitiesBody} />
      ) : null}
      {list.items.map(({ workshop, distanceKm }) => (
        <ListItem
          key={workshop.id}
          title={workshop.title}
          subtitle={workshop.venue?.name ?? t.venueTbc}
          meta={[
            formatWhen(workshop.startAt, workshop.endAt),
            distanceKm === null ? null : format(t.distanceKm, { km: formatDistanceKm(distanceKm) }),
            format(t.slotsLeft, {
              left: volunteerPlacesLeft(workshop),
              total: workshop.volunteerSlots,
            }),
          ]
            .filter(Boolean)
            .join(' · ')}
          right={
            c.assignedIds.has(workshop.id) ? (
              <Badge label={t.youAreAssigned} tone="success" />
            ) : undefined
          }
          onPress={() => navigation.navigate('OpportunityDetail', { workshopId: workshop.id })}
          testID={`opportunity-${workshop.id}`}
        />
      ))}
    </Screen>
  );
}
