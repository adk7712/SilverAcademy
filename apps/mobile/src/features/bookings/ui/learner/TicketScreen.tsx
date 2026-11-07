// UC #2-3 ViewTicket: high-contrast QR, manual-fallback ticket code, attendance status; cached for offline (ADR-019).
import { View } from 'react-native';
import { formatTicketCode } from '@silveracademy/shared';
import {
  AppText,
  Badge,
  Card,
  EmptyState,
  ErrorBanner,
  LoadingState,
  Screen,
  useTheme,
} from '../../../../design';
import { format, strings } from '../../../../i18n';
import { formatDateTime, formatRange } from '../../../../services/dateFormat';
import { useAppRoute } from '../../../../navigation';
import { isTicketValid } from '../../controller/learnerBookingModel';
import { CancelBookingAction } from './CancelBookingAction';
import { useLearnerBookings } from '../../controller/useLearnerBookings';
import { QrCodeView } from './QrCodeView';

export function TicketScreen() {
  const { spacing } = useTheme();
  const s = strings.bookingsLearner;
  const { bookingId } = useAppRoute<'Ticket'>().params;
  const { bookings, loading, error, cachedAt, reload, cancelling, cancelError, cancel } =
    useLearnerBookings();
  const booking = bookings.find((b) => b.id === bookingId);

  let body;
  if (loading && !booking) body = <LoadingState />;
  else if (error) body = <ErrorBanner message={`${s.loadFailed} ${error}`} onRetry={reload} />;
  else if (!booking) body = <EmptyState title={s.ticketMissing} />;
  else {
    const valid = isTicketValid(booking);
    body = (
      <>
        {cancelError ? <ErrorBanner message={cancelError} /> : null}
        <CancelBookingAction
          key={booking.id}
          booking={booking}
          offline={!!cachedAt}
          busy={cancelling || loading}
          onCancel={cancel}
        />
        <AppText variant="heading">{booking.title}</AppText>
        {cachedAt ? (
          <ErrorBanner message={format(s.cachedNotice, { when: formatDateTime(cachedAt) })} />
        ) : null}
        {valid ? (
          <>
            <QrCodeView value={booking.qrPayload} label={s.qrLabel} />
            <Card>
              <AppText variant="title">{s.ticketCodeTitle}</AppText>
              <AppText
                variant="display"
                selectable
                accessibilityLabel={`${s.ticketCodeTitle} ${formatTicketCode(booking.ticketCode).split('').join(' ')}`}
                style={{ letterSpacing: 4, textAlign: 'center' }}
              >
                {formatTicketCode(booking.ticketCode)}
              </AppText>
              <AppText color="textMuted">{s.ticketCodeHelp}</AppText>
            </Card>
          </>
        ) : (
          <ErrorBanner message={s.cancelledNote} />
        )}
        <Card>
          <AppText variant="title">{s.statusTitle}</AppText>
          <Badge
            label={s.status[booking.status]}
            tone={
              booking.status === 'ATTENDED'
                ? 'success'
                : booking.status === 'CANCELLED'
                  ? 'danger'
                  : 'info'
            }
          />
          <AppText>
            {booking.attendedAt
              ? format(s.attendedAt, { when: formatDateTime(booking.attendedAt) })
              : s.notAttended}
          </AppText>
        </Card>
        <Card>
          <AppText variant="bodyStrong">{s.whenTitle}</AppText>
          <AppText>{formatRange(booking.startAt, booking.endAt)}</AppText>
          <AppText variant="bodyStrong">{s.venueTitle}</AppText>
          <AppText>{`${booking.venueName}, ${booking.venueAddress}`}</AppText>
          <AppText variant="bodyStrong">{s.instructorTitle}</AppText>
          <AppText>{booking.instructorName}</AppText>
        </Card>
      </>
    );
  }
  return (
    <Screen title={strings.bookings.ticketTitle}>
      <View style={{ gap: spacing.md }}>{body}</View>
    </Screen>
  );
}
