// Design system: primary action button, min 56dp tall (>= 44 target, NFR 2.2), labelled, loading-aware.
import { ActivityIndicator, Pressable, StyleSheet } from 'react-native';
import { useTheme } from '../ThemeProvider';
import { AppText } from './AppText';

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  loading?: boolean;
  disabled?: boolean;
  /** Defaults to `label`; override only when the visual label is not descriptive enough. */
  accessibilityLabel?: string;
  accessibilityHint?: string;
  /** For toggles such as expand/collapse buttons. */
  expanded?: boolean;
  testID?: string;
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  accessibilityLabel,
  accessibilityHint,
  expanded,
  testID,
}: ButtonProps) {
  const { colors, sizes, radius, spacing } = useTheme();
  const palette = {
    primary: { bg: colors.primary, fg: colors.onPrimary, border: colors.primary },
    secondary: { bg: colors.secondaryBg, fg: colors.onSecondary, border: colors.primary },
    danger: { bg: colors.danger, fg: colors.onDanger, border: colors.danger },
    ghost: { bg: 'transparent', fg: colors.primary, border: 'transparent' },
  }[variant];
  const inactive = disabled || loading;

  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: inactive, busy: loading, expanded }}
      testID={testID}
      style={({ pressed }) => [
        styles.base,
        {
          minHeight: sizes.controlHeight,
          minWidth: sizes.minTouchTarget,
          borderRadius: radius.md,
          paddingHorizontal: spacing.lg,
          paddingVertical: spacing.sm,
          backgroundColor: palette.bg,
          borderColor: palette.border,
          borderWidth: sizes.borderWidth,
          opacity: inactive ? 0.5 : pressed ? 0.85 : 1,
        },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={palette.fg} />
      ) : (
        <AppText variant="button" style={{ color: palette.fg, textAlign: 'center' }}>
          {label}
        </AppText>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({ base: { alignItems: 'center', justifyContent: 'center' } });
