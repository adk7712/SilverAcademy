// Design system: screen header with optional back button and right slot; title announced as header.
import { View } from 'react-native';
import type { ReactNode } from 'react';
import { strings } from '../../i18n';
import { useTheme } from '../ThemeProvider';
import { AppText } from './AppText';
import { IconButton } from './IconButton';

const BACK_GLYPH = '‹';

interface HeaderProps {
  title: string;
  onBack?: () => void;
  right?: ReactNode;
}

export function Header({ title, onBack, right }: HeaderProps) {
  const { colors, spacing, sizes } = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        minHeight: sizes.headerMinHeight,
        paddingHorizontal: spacing.md,
        gap: spacing.sm,
        borderBottomWidth: sizes.borderWidth,
        borderBottomColor: colors.border,
        backgroundColor: colors.background,
      }}
    >
      {onBack ? (
        <IconButton glyph={BACK_GLYPH} accessibilityLabel={strings.common.back} onPress={onBack} />
      ) : null}
      <AppText variant="title" style={{ flex: 1 }} numberOfLines={2}>
        {title}
      </AppText>
      {right}
    </View>
  );
}
