// Design system: inline error message with optional retry/dismiss; announced to screen readers.
import { View } from 'react-native';
import { strings } from '../../i18n';
import { useTheme } from '../ThemeProvider';
import { AppText } from './AppText';
import { Button } from './Button';

interface ErrorBannerProps {
  message: string;
  onRetry?: () => void;
  onDismiss?: () => void;
  testID?: string;
}

export function ErrorBanner({ message, onRetry, onDismiss, testID }: ErrorBannerProps) {
  const { colors, spacing, radius, sizes } = useTheme();
  return (
    <View
      accessibilityRole="alert"
      accessibilityLiveRegion="assertive"
      testID={testID}
      style={{
        gap: spacing.sm,
        padding: spacing.md,
        borderRadius: radius.md,
        borderWidth: sizes.borderWidth,
        borderColor: colors.danger,
        backgroundColor: colors.dangerBg,
      }}
    >
      <AppText color="danger" variant="bodyStrong">
        {message}
      </AppText>
      {onRetry ? (
        <Button label={strings.common.retry} variant="secondary" onPress={onRetry} />
      ) : null}
      {onDismiss ? (
        <Button label={strings.common.dismiss} variant="ghost" onPress={onDismiss} />
      ) : null}
    </View>
  );
}
