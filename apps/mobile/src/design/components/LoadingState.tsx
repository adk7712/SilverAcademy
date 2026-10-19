// Design system: centred spinner with a spoken label.
import { ActivityIndicator, View } from 'react-native';
import { strings } from '../../i18n';
import { useTheme } from '../ThemeProvider';
import { AppText } from './AppText';
import { LOADING_SPINNER_SIZE } from '../tokens';

export function LoadingState({ label = strings.common.loading }: { label?: string }) {
  const { colors, spacing } = useTheme();
  return (
    <View
      accessible
      accessibilityLabel={label}
      accessibilityLiveRegion="polite"
      style={{
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
        padding: spacing.xl,
      }}
    >
      <ActivityIndicator size={LOADING_SPINNER_SIZE} color={colors.primary} />
      <AppText color="textMuted">{label}</AppText>
    </View>
  );
}
