// Design system: segmented single-choice control (mode switch, text size). Each segment >= 48dp (NFR 2.2).
import { Pressable, View } from 'react-native';
import { useTheme } from '../ThemeProvider';
import { AppText } from './AppText';

export interface SegmentOption<T> {
  value: T;
  label: string;
  accessibilityLabel?: string;
}

interface SegmentedProps<T> {
  options: readonly SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  testID?: string;
}

export function Segmented<T extends string | number>({
  options,
  value,
  onChange,
  testID,
}: SegmentedProps<T>) {
  const { colors, sizes, radius } = useTheme();
  return (
    <View
      accessibilityRole="radiogroup"
      testID={testID}
      style={{
        flexDirection: 'row',
        borderWidth: sizes.borderWidth,
        borderColor: colors.primary,
        borderRadius: radius.md,
        overflow: 'hidden',
      }}
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={String(option.value)}
            onPress={() => onChange(option.value)}
            accessibilityRole="radio"
            accessibilityLabel={option.accessibilityLabel ?? option.label}
            accessibilityState={{ selected, checked: selected }}
            style={{
              flex: 1,
              minHeight: sizes.iconButton,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: selected ? colors.primary : colors.background,
            }}
          >
            <AppText
              variant="bodyStrong"
              style={{ color: selected ? colors.onPrimary : colors.primary }}
            >
              {option.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}
