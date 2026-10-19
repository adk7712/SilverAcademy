// UC #1-1 oversized dashboard action button (SS 618 style: very large target, large label).
import { Pressable } from 'react-native';
import { AppText, useTheme } from '../../../../design';

const BIG_BUTTON_MIN_HEIGHT = 96;

interface Props {
  label: string;
  hint: string;
  onPress: () => void;
  disabled?: boolean;
  testID?: string;
}

export function BigActionButton({ label, hint, onPress, disabled, testID }: Props) {
  const { colors, radius, spacing } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={hint}
      accessibilityState={{ disabled: !!disabled }}
      testID={testID}
      style={({ pressed }) => ({
        minHeight: BIG_BUTTON_MIN_HEIGHT,
        justifyContent: 'center',
        paddingHorizontal: spacing.lg,
        borderRadius: radius.lg,
        backgroundColor: colors.primary,
        opacity: disabled ? 0.5 : pressed ? 0.85 : 1,
      })}
    >
      <AppText variant="heading" style={{ color: colors.onPrimary }}>
        {label}
      </AppText>
      <AppText style={{ color: colors.onPrimary }}>{hint}</AppText>
    </Pressable>
  );
}
