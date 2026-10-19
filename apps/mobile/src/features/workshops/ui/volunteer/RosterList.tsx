// UC #3-3 class list block: registered learners and fellow volunteers (NOT_ASSIGNED shows the server's denial).
import { View } from 'react-native';
import { AppText, Badge, ErrorBanner, LoadingState, useTheme } from '../../../../design';
import { format, strings } from '../../../../i18n';
import type { RosterState } from '../../controller/useAssignedWorkshops';

const t = strings.workshopsVolunteer;

export function RosterList({
  state,
  onRetry,
}: {
  state: RosterState | undefined;
  onRetry: () => void;
}) {
  const { spacing } = useTheme();
  if (!state || state.status === 'loading') return <LoadingState />;
  if (state.status === 'error') return <ErrorBanner message={state.message} onRetry={onRetry} />;
  const { roster } = state;
  return (
    <View style={{ gap: spacing.sm }}>
      <AppText variant="bodyStrong">
        {format(t.attendance, {
          attended: roster.workshop.attendedCount,
          taken: roster.workshop.seatsTaken,
        })}
      </AppText>
      <AppText variant="bodyStrong">{t.classList}</AppText>
      {roster.learners.length === 0 ? <AppText color="textMuted">{t.noLearners}</AppText> : null}
      {roster.learners.map((l) => (
        <View
          key={l.bookingId}
          style={{ flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm }}
        >
          <AppText style={{ flex: 1 }}>{l.learnerName}</AppText>
          {l.status === 'ATTENDED' ? <Badge label={t.attendedAt} tone="success" /> : null}
        </View>
      ))}
      {roster.volunteers.length > 0 ? (
        <>
          <AppText variant="bodyStrong">{t.volunteersHeading}</AppText>
          {roster.volunteers.map((v) => (
            <AppText key={v.volunteerId}>{v.volunteerName}</AppText>
          ))}
        </>
      ) : null}
    </View>
  );
}
