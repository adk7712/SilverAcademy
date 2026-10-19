// Design system: icon-only button with mandatory accessibility label, 48dp (>= 44 target, NFR 2.2).
import { Pressable, StyleSheet } from 'react-native';
import { useTheme } from '../ThemeProvider';
import { AppText } from './AppText';

interface IconButtonProps {
  /** Text glyph shown as the icon, e.g. a chevron or cross. */
  glyph: string;
  accessibilityLabel: string;
  onPress: () => void;
  disabled?: boolean;
  testID?: string;
}

export function IconButton({
  glyph,
  accessibilityLabel,
  onPress,
  disabled,
  testID,
}: IconButtonProps) {
  const { colors, sizes, radius } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: !!disabled }}
      testID={testID}
      style={({ pressed }) => [
        styles.base,
        {
          width: sizes.iconButton,
          height: sizes.iconButton,
          borderRadius: radius.pill,
          backgroundColor: pressed ? colors.secondaryBg : 'transparent',
          opacity: disabled ? 0.5 : 1,
        },
      ]}
    >
      <AppText variant="title" color="primary" importantForAccessibility="no">
        {glyph}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({ base: { alignItems: 'center', justifyContent: 'center' } });
