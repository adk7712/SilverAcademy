// Design system: standard screen frame (safe area, header, scroll body). Back button appears automatically in stacks.
import { useContext } from 'react';
import type { ReactNode } from 'react';
import { ScrollView, View } from 'react-native';
import { NavigationContext } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../ThemeProvider';
import { Header } from './Header';

interface ScreenProps {
  title: string;
  children: ReactNode;
  /** False for screens that manage their own scrolling (lists, camera). Default true. */
  scroll?: boolean;
  headerRight?: ReactNode;
  /** Override the automatic back behaviour. */
  onBack?: () => void;
  testID?: string;
}

export function Screen({
  title,
  children,
  scroll = true,
  headerRight,
  onBack,
  testID,
}: ScreenProps) {
  const { colors, spacing } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useContext(NavigationContext);
  // Only this stack's history counts: canGoBack() would also be true at a stack root inside tabs.
  const hasPrevious = (navigation?.getState()?.index ?? 0) > 0;
  const back = onBack ?? (hasPrevious ? () => navigation?.goBack() : undefined);
  const bodyStyle = { padding: spacing.md, gap: spacing.md };

  return (
    <View
      style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top }}
      testID={testID}
    >
      <Header title={title} onBack={back} right={headerRight} />
      {scroll ? (
        <ScrollView contentContainerStyle={bodyStyle} keyboardShouldPersistTaps="handled">
          {children}
        </ScrollView>
      ) : (
        <View style={[{ flex: 1 }, bodyStyle]}>{children}</View>
      )}
    </View>
  );
}
