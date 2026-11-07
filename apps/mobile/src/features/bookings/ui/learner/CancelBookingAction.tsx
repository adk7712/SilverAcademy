import { useState } from 'react';
import { AppText, Button, Card } from '../../../../design';
import { strings } from '../../../../i18n';
import { canCancelBooking, type BookingView } from '../../controller/learnerBookingModel';

/** Shared confirmation for both learner entry points. No offline cancellation is queued. */
export function CancelBookingAction({
  booking,
  offline,
  busy,
  onCancel,
}: {
  booking: BookingView;
  offline: boolean;
  busy: boolean;
  onCancel: (workshopId: string) => Promise<boolean>;
}) {
  const [confirming, setConfirming] = useState(false);
  const s = strings.bookingsLearner;
  if (!canCancelBooking(booking, new Date())) return null;
  if (offline) return <AppText color="textMuted">{s.cancellationOnline}</AppText>;
  if (!confirming)
    return (
      <Button
        label={s.cancelBooking}
        variant="danger"
        disabled={busy}
        onPress={() => setConfirming(true)}
        testID={`cancel-${booking.id}`}
      />
    );
  return (
    <Card>
      <AppText>{s.cancelConfirm}</AppText>
      <Button
        label={s.confirmCancel}
        variant="danger"
        loading={busy}
        onPress={() => {
          void onCancel(booking.workshopId).then((ok) => {
            if (ok) setConfirming(false);
          });
        }}
        testID={`confirm-cancel-${booking.id}`}
      />
      <Button
        label={s.keepBooking}
        variant="secondary"
        disabled={busy}
        onPress={() => setConfirming(false)}
      />
    </Card>
  );
}
