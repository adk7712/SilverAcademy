// Profile notifications section: list with unread badge and a "mark as read" button per item.
import { View } from 'react-native';
import {
  AppText,
  Badge,
  Button,
  Card,
  ErrorBanner,
  LoadingState,
  useTheme,
} from '../../../../design';
import { strings } from '../../../../i18n';
import { useNotifications } from '../../controller/useNotifications';

const t = strings.usersProfile;

export function NotificationsList() {
  const { spacing } = useTheme();
  const c = useNotifications();
  return (
    <View style={{ gap: spacing.sm }}>
      <AppText variant="title">{t.notifications}</AppText>
      {c.loading ? <LoadingState /> : null}
      {c.error ? <ErrorBanner message={c.error} onRetry={() => void c.reload()} /> : null}
      {!c.loading && !c.error && c.items.length === 0 ? (
        <AppText color="textMuted">{t.notificationsEmpty}</AppText>
      ) : null}
      {c.items.map((n) => (
        <Card key={n.id} testID={`notification-${n.id}`}>
          {!n.read ? <Badge label={t.unread} tone="info" /> : null}
          <AppText variant="bodyStrong">{n.title}</AppText>
          <AppText>{n.body}</AppText>
          {!n.read ? (
            <Button label={t.markRead} variant="secondary" onPress={() => void c.markRead(n.id)} />
          ) : null}
        </Card>
      ))}
    </View>
  );
}
