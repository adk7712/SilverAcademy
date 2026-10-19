// Design system: small status pill; colour is never the only signal because the label states the status.
import { View } from 'react-native';
import { useTheme } from '../ThemeProvider';
import { AppText } from './AppText';
import type { ColorName } from '../tokens';

export type BadgeTone = 'neutral' | 'success' | 'warning' | 'danger' | 'info';

const TONES: Record<BadgeTone, { bg: ColorName; fg: ColorName }> = {
  neutral: { bg: 'neutralBg', fg: 'onNeutral' },
  success: { bg: 'successBg', fg: 'onSuccess' },
  warning: { bg: 'warningBg', fg: 'onWarning' },
  danger: { bg: 'dangerBg', fg: 'danger' },
  info: { bg: 'infoBg', fg: 'onInfo' },
};

interface BadgeProps {
  label: string;
  tone?: BadgeTone;
}

export function Badge({ label, tone = 'neutral' }: BadgeProps) {
  const { colors, spacing, radius } = useTheme();
  const t = TONES[tone];
  return (
    <View
      accessible
      accessibilityLabel={label}
      style={{
        alignSelf: 'flex-start',
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
        borderRadius: radius.pill,
        backgroundColor: colors[t.bg],
      }}
    >
      <AppText variant="caption" style={{ color: colors[t.fg], fontWeight: '700' }}>
        {label}
      </AppText>
    </View>
  );
}
