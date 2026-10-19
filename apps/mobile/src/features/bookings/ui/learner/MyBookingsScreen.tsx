// UC #2-3 ViewTicket: Learner's own bookings, upcoming first; works offline from the local copy.
import { View } from 'react-native';
import {
  AppText,
  Badge,
  EmptyState,
  ErrorBanner,
  ListItem,
  LoadingState,
  Screen,
  useTheme,
} from '../../../../design';
import type { BadgeTone } from '../../../../design';
import { format, strings } from '../../../../i18n';
import { formatDateTime } from '../../../../services/dateFormat';
import { useAppNavigation } from '../../../../navigation';
import { groupBookings, type BookingView } from '../../controller/learnerBookingModel';
import { useLearnerBookings } from '../../controller/useLearnerBookings';

const TONE: Record<BookingView['status'], BadgeTone> = {
  CONFIRMED: 'info',
  ATTENDED: 'success',
  CANCELLED: 'danger',
};

export function MyBookingsScreen() {
  const { spacing } = useTheme();
  const s = strings.bookingsLearner;
  const navigation = useAppNavigation();
  const { bookings, loading, error, cachedAt, reload } = useLearnerBookings();
  const { upcoming, past } = groupBookings(bookings, new Date());

  const row = (b: BookingView) => (
    <ListItem
      key={b.id}
      title={b.title}
      subtitle={formatDateTime(b.startAt)}
      meta={b.venueName}
      right={<Badge label={s.status[b.status]} tone={TONE[b.status]} />}
      onPress={() => navigation.navigate('Ticket', { bookingId: b.id })}
      testID={`booking-${b.id}`}
    />
  );
  const section = (title: string, items: BookingView[]) =>
    items.length === 0 ? null : (
      <View style={{ gap: spacing.smd }}>
        <AppText variant="title">{title}</AppText>
        {items.map(row)}
      </View>
    );

  return (
    <Screen title={strings.bookings.myBookingsTitle}>
      {cachedAt ? (
        <ErrorBanner message={format(s.offlineNotice, { when: formatDateTime(cachedAt) })} />
      ) : null}
      {error ? <ErrorBanner message={`${s.loadFailed} ${error}`} onRetry={reload} /> : null}
      {loading && bookings.length === 0 ? <LoadingState /> : null}
      {!loading && !error && bookings.length === 0 ? (
        <EmptyState
          title={s.emptyTitle}
          message={s.emptyMessage}
          actionLabel={s.emptyAction}
          onAction={() => navigation.navigate('DiscoverTab', { screen: 'DiscoverHome' })}
        />
      ) : null}
      {section(s.upcomingTitle, upcoming)}
      {section(s.pastTitle, past)}
    </Screen>
  );
}
