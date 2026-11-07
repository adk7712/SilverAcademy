// UC #0-1 permanent "DEMO - not real Singpass" banner, shown on the login screen and every fake Singpass state.
import { View } from 'react-native';
import { AppText, useTheme } from '../../../design';
import { strings } from '../../../i18n';

export function DemoBanner() {
  const { colors, spacing, radius, sizes } = useTheme();
  return (
    <View
      accessible
      accessibilityRole="alert"
      testID="demo-banner"
      style={{
        padding: spacing.smd,
        borderRadius: radius.md,
        borderWidth: sizes.borderWidth,
        borderColor: colors.onWarning,
        backgroundColor: colors.warningBg,
      }}
    >
      <AppText variant="bodyStrong" style={{ color: colors.onWarning, textAlign: 'center' }}>
        {strings.auth.demoBanner}
      </AppText>
    </View>
  );
}
