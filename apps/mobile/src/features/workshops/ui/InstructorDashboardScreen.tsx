// UC #1-1 Instructor dashboard: big quick actions, profile approval state, my workshops with next step.
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
} from '../../../design';
import { format, strings } from '../../../i18n';
import { useAppNavigation } from '../../../navigation';
import { isProfileApproved, useInstructorProfile } from '../../users';
import { nextStepFor, workshopStatusInfo } from '../controller/instructorWorkshopLogic';
import { useMyWorkshops } from '../controller/useMyWorkshops';
import { BigActionButton } from './instructor/BigActionButton';
import { ProfileStateCard } from './instructor/ProfileStateCard';

const t = strings.workshopsInstructor;

export function InstructorDashboardScreen() {
  const navigation = useAppNavigation();
  const { spacing } = useTheme();
  const profile = useInstructorProfile();
  const mine = useMyWorkshops();
  const approved = isProfileApproved(profile.status);

  return (
    <Screen title={strings.workshops.dashboardTitle}>
      <View style={{ gap: spacing.md }}>
        {!profile.loading ? (
          <ProfileStateCard
            status={profile.status}
            onOpenProfile={() => navigation.navigate('InstructorProfileForm')}
          />
        ) : null}
        <BigActionButton
          label={strings.workshops.quickCreate}
          hint={t.quickCreateHint}
          disabled={!approved && !profile.loading}
          onPress={() => navigation.navigate('CreateWorkshop')}
        />
        <BigActionButton
          label={strings.workshops.quickScan}
          hint={t.quickScanHint}
          onPress={() => navigation.navigate('ScanAttendance')}
        />
        <BigActionButton
          label={strings.workshops.quickWallet}
          hint={t.quickWalletHint}
          onPress={() => navigation.navigate('Wallet')}
        />
      </View>
      <AppText variant="title">{t.myWorkshops}</AppText>
      {mine.error ? <ErrorBanner message={mine.error} onRetry={mine.reload} /> : null}
      {mine.loading && mine.workshops.length === 0 ? <LoadingState /> : null}
      {!mine.loading && !mine.error && mine.workshops.length === 0 ? (
        <EmptyState title={t.noWorkshopsTitle} message={t.noWorkshopsMessage} />
      ) : null}
      {mine.workshops.map((w) => {
        const info = workshopStatusInfo(w.status);
        const step = nextStepFor(w.status);
        const go = () => {
          if (step.kind === 'REQUEST_VENUE' || step.kind === 'VIEW_REQUEST') {
            navigation.navigate('VenueRequest', { workshopId: w.id });
          } else if (step.kind === 'ROSTER') navigation.navigate('Roster', { workshopId: w.id });
        };
        return (
          <View key={w.id} style={{ gap: spacing.sm }}>
            <ListItem
              title={w.title}
              subtitle={format(t.capacityMeta, { capacity: w.capacity, booked: w.seatsTaken })}
              right={<Badge label={info.label} tone={info.tone} />}
            />
            {step.kind !== 'NONE' ? (
              <Button
                label={step.label}
                variant="secondary"
                disabled={step.kind === 'REQUEST_VENUE' && !approved}
                onPress={go}
                accessibilityLabel={`${step.label}: ${w.title}`}
              />
            ) : null}
          </View>
        );
      })}
    </Screen>
  );
}
