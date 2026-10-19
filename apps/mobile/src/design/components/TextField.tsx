// Design system: labelled text input with inline error (NFR 2.4), 56dp tall (>= 44 target).
import { TextInput, View, type TextInputProps } from 'react-native';
import { useTheme } from '../ThemeProvider';
import { AppText } from './AppText';

interface TextFieldProps extends Pick<
  TextInputProps,
  | 'value'
  | 'onChangeText'
  | 'placeholder'
  | 'secureTextEntry'
  | 'keyboardType'
  | 'autoCapitalize'
  | 'autoCorrect'
  | 'maxLength'
  | 'returnKeyType'
  | 'onSubmitEditing'
> {
  label: string;
  error?: string;
  helper?: string;
  multiline?: boolean;
  testID?: string;
}

const MULTILINE_MIN_LINES = 4;

export function TextField({ label, error, helper, multiline, testID, ...input }: TextFieldProps) {
  const theme = useTheme();
  const { colors, sizes, radius, spacing } = theme;
  const lineHeight = theme.text('body').lineHeight ?? sizes.controlHeight;
  return (
    <View style={{ gap: spacing.xs }}>
      <AppText variant="bodyStrong">{label}</AppText>
      <TextInput
        {...input}
        multiline={multiline}
        testID={testID}
        accessibilityLabel={label}
        accessibilityHint={helper}
        placeholderTextColor={colors.textMuted}
        style={[
          theme.text('body'),
          {
            minHeight: multiline ? lineHeight * MULTILINE_MIN_LINES : sizes.controlHeight,
            borderWidth: error ? sizes.focusBorderWidth : sizes.borderWidth,
            borderColor: error ? colors.danger : colors.border,
            borderRadius: radius.md,
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.sm,
            backgroundColor: colors.background,
            textAlignVertical: multiline ? 'top' : 'center',
          },
        ]}
      />
      {helper && !error ? (
        <AppText variant="caption" color="textMuted">
          {helper}
        </AppText>
      ) : null}
      {error ? (
        <AppText variant="caption" color="danger" accessibilityLiveRegion="polite">
          {error}
        </AppText>
      ) : null}
    </View>
  );
}
