// Profile tab: account panel (text size, logout), Feedback entry (learners), Report an issue, notifications.
import { Button, Screen } from '../../../design';
import { strings } from '../../../i18n';
import { AccountPanel, useSession } from '../../auth';
import { useAppNavigation } from '../../../navigation';
import { NotificationsList } from './profile/NotificationsList';

export function ProfileScreen() {
  const navigation = useAppNavigation();
  const { state } = useSession();
  const isLearner = state.status === 'signedIn' && state.roles.includes('LEARNER');
  return (
    <Screen title={strings.users.profileTitle}>
      <AccountPanel />
      {isLearner ? (
        <Button
          label={strings.usersProfile.feedbackEntry}
          variant="secondary"
          onPress={() => navigation.navigate('Feedback')}
          testID="open-feedback"
        />
      ) : null}
      <Button
        label={strings.users.reportIssue}
        variant="secondary"
        onPress={() => navigation.navigate('ReportIssue')}
      />
      <NotificationsList />
    </Screen>
  );
}
