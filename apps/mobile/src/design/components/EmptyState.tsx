// Design system: friendly empty-list placeholder with optional action.
import { View } from 'react-native';
import { useTheme } from '../ThemeProvider';
import { AppText } from './AppText';
import { Button } from './Button';

interface EmptyStateProps {
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ title, message, actionLabel, onAction }: EmptyStateProps) {
  const { spacing } = useTheme();
  return (
    <View style={{ alignItems: 'center', gap: spacing.sm, padding: spacing.xl }}>
      <AppText variant="title" style={{ textAlign: 'center' }}>
        {title}
      </AppText>
      {message ? (
        <AppText color="textMuted" style={{ textAlign: 'center' }}>
          {message}
        </AppText>
      ) : null}
      {actionLabel && onAction ? <Button label={actionLabel} onPress={onAction} /> : null}
    </View>
  );
}
