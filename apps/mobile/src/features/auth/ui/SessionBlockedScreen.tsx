// UC #0-1 dead-end screens: suspended/inactive account, or a staff account that belongs on the web app. Both can log out.
import { AppText, Button, Card, Screen } from '../../../design';
import { strings } from '../../../i18n';
import { useSession } from '../controller/SessionProvider';

export function SessionBlockedScreen({ reason }: { reason: 'blocked' | 'unsupported' }) {
  const { signOut } = useSession();
  const title = reason === 'blocked' ? strings.auth.blockedTitle : strings.auth.unsupportedTitle;
  const body = reason === 'blocked' ? strings.auth.blockedBody : strings.auth.unsupportedBody;
  return (
    <Screen title={title} testID={`blocked-${reason}`}>
      <Card>
        <AppText>{body}</AppText>
      </Card>
      <Button label={strings.common.logout} onPress={() => void signOut()} />
    </Screen>
  );
}
