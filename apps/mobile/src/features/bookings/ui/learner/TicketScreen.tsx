// UC #2-3 ViewTicket: high-contrast QR, session-code check-in fallback, attendance status; cached for offline (ADR-019).
import { useState } from 'react';
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
  TextField,
  useTheme,
} from '../../../../design';
import { format, strings } from '../../../../i18n';
import { formatDateTime, formatRange } from '../../../../services/dateFormat';
import { useAppRoute } from '../../../../navigation';
import { isTicketValid } from '../../controller/learnerBookingModel';
import { CancelBookingAction } from './CancelBookingAction';
import { useLearnerBookings } from '../../controller/useLearnerBookings';
import { QrCodeView } from './QrCodeView';

const s = strings.bookingsLearner;

/** Fallback when the QR cannot be scanned: type the code the instructor announces. */
function SessionCodeCheckIn({ onSubmit }: { onSubmit: (code: string) => Promise<string | null> }) {
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submit = async () => {
    setBusy(true);
    setError(await onSubmit(code));
    setBusy(false);
  };
  return (
    <Card>
      <AppText variant="title">{s.sessionCodeTitle}</AppText>
      <TextField
        label={s.sessionCodeLabel}
        helper={s.sessionCodeHelp}
        value={code}
        onChangeText={setCode}
        autoCapitalize="characters"
        autoCorrect={false}
        error={error ?? undefined}
        testID="session-code-input"
      />
      <Button
        label={s.sessionCodeSubmit}
        loading={busy}
        disabled={code.trim().length < 4}
        onPress={() => void submit()}
        testID="session-code-submit"
      />
    </Card>
  );
}

export function TicketScreen() {
  const { spacing } = useTheme();
  const { bookingId } = useAppRoute<'Ticket'>().params;
  const { bookings, loading, error, cachedAt, reload, cancelling, cancelError, cancel, checkIn } =
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
            {booking.status === 'CONFIRMED' && !cachedAt ? (
              <SessionCodeCheckIn onSubmit={(code) => checkIn(booking.id, code)} />
            ) : null}
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
