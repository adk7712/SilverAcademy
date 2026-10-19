// Design system: single-choice dropdown (inline expanding list), options >= 48dp (NFR 2.2).
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { strings } from '../../i18n';
import { useTheme } from '../ThemeProvider';
import { AppText } from './AppText';
import type { SegmentOption } from './Segmented';

interface SelectProps<T> {
  label: string;
  options: readonly SegmentOption<T>[];
  value: T | null;
  onChange: (value: T) => void;
  error?: string;
  testID?: string;
}

export function Select<T extends string | number>({
  label,
  options,
  value,
  onChange,
  error,
  testID,
}: SelectProps<T>) {
  const { colors, sizes, radius, spacing } = useTheme();
  const [open, setOpen] = useState(false);
  const current = options.find((o) => o.value === value);
  return (
    <View style={{ gap: spacing.xs }}>
      <AppText variant="bodyStrong">{label}</AppText>
      <Pressable
        onPress={() => setOpen((o) => !o)}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${current?.label ?? strings.common.select}`}
        accessibilityState={{ expanded: open }}
        testID={testID}
        style={{
          minHeight: sizes.controlHeight,
          justifyContent: 'center',
          paddingHorizontal: spacing.md,
          borderWidth: error ? sizes.focusBorderWidth : sizes.borderWidth,
          borderColor: error ? colors.danger : colors.border,
          borderRadius: radius.md,
          backgroundColor: colors.background,
        }}
      >
        <AppText>{current?.label ?? strings.common.select}</AppText>
      </Pressable>
      {open
        ? options.map((option) => (
            <Pressable
              key={String(option.value)}
              onPress={() => {
                onChange(option.value);
                setOpen(false);
              }}
              accessibilityRole="radio"
              accessibilityLabel={option.accessibilityLabel ?? option.label}
              accessibilityState={{
                selected: option.value === value,
                checked: option.value === value,
              }}
              style={{
                minHeight: sizes.iconButton,
                justifyContent: 'center',
                paddingHorizontal: spacing.md,
                borderRadius: radius.sm,
                backgroundColor: option.value === value ? colors.secondaryBg : colors.surface,
              }}
            >
              <AppText variant={option.value === value ? 'bodyStrong' : 'body'}>
                {option.label}
              </AppText>
            </Pressable>
          ))
        : null}
      {error ? (
        <AppText variant="caption" color="danger" accessibilityLiveRegion="polite">
          {error}
        </AppText>
      ) : null}
    </View>
  );
}
