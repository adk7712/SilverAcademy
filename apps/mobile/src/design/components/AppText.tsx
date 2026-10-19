// Design system: themed, font-scaled text (NFR 2.1). Headings are announced as headers.
import { Text, type TextProps } from 'react-native';
import { useTheme } from '../ThemeProvider';
import type { ColorName, TextVariant } from '../tokens';

const HEADING_VARIANTS: readonly TextVariant[] = ['title', 'heading', 'display'];

interface AppTextProps extends TextProps {
  variant?: TextVariant;
  color?: ColorName;
}

export function AppText({ variant = 'body', color = 'text', style, ...rest }: AppTextProps) {
  const theme = useTheme();
  const isHeading = HEADING_VARIANTS.includes(variant);
  return (
    <Text
      accessibilityRole={isHeading ? 'header' : undefined}
      {...rest}
      style={[theme.text(variant), { color: theme.colors[color] }, style]}
    />
  );
}
