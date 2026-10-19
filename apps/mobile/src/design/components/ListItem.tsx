// Design system: list row, min 64dp tall (>= 44 target, NFR 2.2); pressable when onPress is given.
import { Pressable, View } from 'react-native';
import type { ReactNode } from 'react';
import { useTheme } from '../ThemeProvider';
import { AppText } from './AppText';

interface ListItemProps {
  title: string;
  subtitle?: string;
  meta?: string;
  /** Trailing content such as a Badge. */
  right?: ReactNode;
  onPress?: () => void;
  accessibilityLabel?: string;
  testID?: string;
}

export function ListItem({
  title,
  subtitle,
  meta,
  right,
  onPress,
  accessibilityLabel,
  testID,
}: ListItemProps) {
  const { colors, sizes, spacing, radius } = useTheme();
  const content = (
    <>
      <View style={{ flex: 1, gap: spacing.xs }}>
        <AppText variant="bodyStrong">{title}</AppText>
        {subtitle ? <AppText color="textMuted">{subtitle}</AppText> : null}
        {meta ? (
          <AppText variant="caption" color="textMuted">
            {meta}
          </AppText>
        ) : null}
      </View>
      {right}
    </>
  );
  const style = {
    minHeight: sizes.listItemMinHeight,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: spacing.sm,
    padding: spacing.md,
    borderWidth: sizes.borderWidth,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.background,
  };
  if (!onPress) {
    return (
      <View style={style} testID={testID}>
        {content}
      </View>
    );
  }
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? [title, subtitle, meta].filter(Boolean).join(', ')}
      testID={testID}
      style={({ pressed }) => [style, { opacity: pressed ? 0.85 : 1 }]}
    >
      {content}
    </Pressable>
  );
}
