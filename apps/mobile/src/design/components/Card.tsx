// Design system: bordered surface container; pressable when onPress is given (min 44dp tall then).
import { Pressable, View, type StyleProp, type ViewStyle } from 'react-native';
import type { ReactNode } from 'react';
import { useTheme } from '../ThemeProvider';

interface CardProps {
  children: ReactNode;
  onPress?: () => void;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export function Card({ children, onPress, accessibilityLabel, style, testID }: CardProps) {
  const { colors, spacing, radius, sizes } = useTheme();
  const base: ViewStyle = {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: sizes.borderWidth,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.sm,
  };
  if (!onPress) {
    return (
      <View style={[base, style]} testID={testID}>
        {children}
      </View>
    );
  }
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      testID={testID}
      style={({ pressed }) => [
        base,
        { minHeight: sizes.minTouchTarget, opacity: pressed ? 0.85 : 1 },
        style,
      ]}
    >
      {children}
    </Pressable>
  );
}
