// UC #2-2 BookWorkshops: workshop detail, Book button with confirmation, clear failure messages.
import { useState } from 'react';
import { View } from 'react-native';
import { seatsRemaining } from '@silveracademy/shared';
import {
  AppText,
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorBanner,
  LoadingState,
  Screen,
  useToast,
  useTheme,
} from '../../../../design';
import { format, strings } from '../../../../i18n';
import { formatDateTime, formatRange } from '../../../../services/dateFormat';
import { useAppNavigation, useAppRoute } from '../../../../navigation';
import { blockMessage, bookBlockReason } from '../../controller/learnerDetailLogic';
import { useLearnerWorkshopDetail } from '../../controller/useLearnerWorkshopDetail';

export function WorkshopDetailScreen() {
  const { spacing } = useTheme();
  const s = strings.workshopsLearner;
  const { workshopId } = useAppRoute<'WorkshopDetail'>().params;
  const navigation = useAppNavigation();
  const toast = useToast();
  const d = useLearnerWorkshopDetail(workshopId);
  const [confirming, setConfirming] = useState(false);

  const viewTicket = (bookingId: string) =>
    navigation.navigate('MyBookingsTab', { screen: 'Ticket', params: { bookingId } });

  const w = d.workshop;
  let body;
  if (d.loading && !w) body = <LoadingState />;
  else if (d.loadError) body = <ErrorBanner message={d.loadError} onRetry={d.reload} />;
  else if (!w) body = <EmptyState title={s.detailMissing} />;
  else {
    const block = bookBlockReason(w, new Date());
    const when = w.startAt && w.endAt ? formatRange(w.startAt.toDate(), w.endAt.toDate()) : '';
    const left = seatsRemaining(w);
    const confirmBooking = async () => {
      setConfirming(false);
      if (await d.book()) toast.show(s.bookedToast, 'success');
    };
    body = (
      <>
        <AppText variant="heading">{w.title}</AppText>
        <Badge label={s.categories[w.category]} tone="info" />
        <Card>
          <AppText variant="bodyStrong">{s.whenTitle}</AppText>
          <AppText>{when}</AppText>
          <AppText variant="bodyStrong">{s.venueTitle}</AppText>
          <AppText>{w.venue ? `${w.venue.name}, ${w.venue.address}` : '-'}</AppText>
          <AppText variant="bodyStrong">{s.instructorTitle}</AppText>
          <AppText>{w.instructorName}</AppText>
          <AppText variant="bodyStrong">{s.capacityTitle}</AppText>
          <AppText>
            {format(s.capacityValue, { taken: w.seatsTaken, capacity: w.capacity, left })}
          </AppText>
        </Card>
        <Card>
          <AppText variant="bodyStrong">{s.descriptionTitle}</AppText>
          <AppText>{w.description}</AppText>
          <AppText variant="bodyStrong">{s.materialsTitle}</AppText>
          <AppText>{w.materials.trim() || s.materialsNone}</AppText>
        </Card>
        {d.booked ? (
          <Card>
            <AppText variant="title">{s.confirmedTitle}</AppText>
            <AppText>{format(s.confirmedBody, { code: d.booked.ticketCode })}</AppText>
            <Button label={s.viewTicket} onPress={() => viewTicket(d.booked!.bookingId)} />
          </Card>
        ) : null}
        {d.failure ? (
          <>
            <ErrorBanner message={d.failure.message} />
            {d.failure.existingBookingId ? (
              <Button
                label={s.viewTicket}
                onPress={() => viewTicket(d.failure!.existingBookingId!)}
              />
            ) : null}
          </>
        ) : null}
        {!d.booked && !d.failure?.existingBookingId ? (
          block ? (
            <ErrorBanner message={blockMessage(block)} />
          ) : confirming ? (
            <Card>
              <AppText variant="title">{s.confirmTitle}</AppText>
              <AppText>
                {format(s.confirmBody, {
                  title: w.title,
                  when: formatDateTime(w.startAt!.toDate()),
                })}
              </AppText>
              <View style={{ gap: spacing.smd }}>
                <Button label={s.confirmBook} onPress={confirmBooking} loading={d.booking} />
                <Button
                  label={strings.common.cancel}
                  variant="secondary"
                  onPress={() => setConfirming(false)}
                />
              </View>
            </Card>
          ) : (
            <Button
              label={s.bookButton}
              onPress={() => setConfirming(true)}
              loading={d.booking}
              testID="book-button"
            />
          )
        ) : null}
      </>
    );
  }
  return (
    <Screen title={strings.workshops.detailTitle}>
      <View style={{ gap: spacing.md }}>{body}</View>
    </Screen>
  );
}
