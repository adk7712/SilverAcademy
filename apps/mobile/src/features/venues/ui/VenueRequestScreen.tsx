// UC #1-3 RequestVenue: pick venue (map or list fallback) and time, submit, track status, reply to info request.
import {
  AppText,
  Button,
  EmptyState,
  ErrorBanner,
  LoadingState,
  Screen,
  useTheme,
} from '../../../design';
import { format, strings } from '../../../i18n';
import { useAppRoute } from '../../../navigation';
import { useMapAvailability } from '../controller/useMapAvailability';
import { useVenueRequest } from '../controller/useVenueRequest';
import { formatSlot } from '../controller/venueRequestLogic';
import { RequestStatusCard } from './instructor/RequestStatusCard';
import { VenuePicker } from './instructor/VenuePicker';

const t = strings.venuesInstructor;

export function VenueRequestScreen() {
  const { workshopId } = useAppRoute<'VenueRequest'>().params;
  const { spacing } = useTheme();
  const map = useMapAvailability();
  const v = useVenueRequest(workshopId);

  if (v.loading && !v.workshop) {
    return (
      <Screen title={strings.venues.requestTitle}>
        <LoadingState />
      </Screen>
    );
  }
  if (!v.workshop) {
    return (
      <Screen title={strings.venues.requestTitle}>
        {v.error ? (
          <ErrorBanner message={v.error} onRetry={v.reload} />
        ) : (
          <EmptyState title={t.notFoundTitle} />
        )}
      </Screen>
    );
  }
  const slot = v.chosenFacility?.slots.find((s) => s.id === v.slotId);
  return (
    <Screen title={strings.venues.requestTitle}>
      <AppText>{format(t.intro, { title: v.workshop.title })}</AppText>
      {v.error ? <ErrorBanner message={v.error} /> : null}
      {v.notice ? (
        <AppText variant="bodyStrong" color="onSuccess">
          {v.notice}
        </AppText>
      ) : null}
      {v.latest ? (
        <RequestStatusCard
          request={v.latest}
          busy={v.busy}
          replyError={v.replyError}
          onReply={v.reply}
          onWithdraw={() => void v.withdraw()}
        />
      ) : null}
      {v.mayPick ? (
        <>
          <VenuePicker
            options={v.options}
            capacity={v.workshop.capacity}
            facilityId={v.facilityId}
            slotId={v.slotId}
            mapAvailable={map.available}
            attribution={map.attribution}
            onFacility={v.selectFacility}
            onSlot={v.selectSlot}
          />
          {slot ? (
            <AppText variant="bodyStrong" style={{ marginTop: spacing.sm }}>
              {format(t.selectedSlot, { slot: formatSlot(slot) })}
            </AppText>
          ) : null}
          <Button
            label={t.submit}
            disabled={!v.slotId}
            loading={v.busy}
            onPress={() => void v.submit()}
          />
        </>
      ) : !v.latest ? (
        <AppText>
          {format(t.workshopStatusNote, {
            status: strings.workshopsInstructor.statusLabels[v.workshop.status],
          })}
        </AppText>
      ) : null}
    </Screen>
  );
}
