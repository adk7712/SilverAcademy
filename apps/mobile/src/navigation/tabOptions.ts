// Shared bottom-tab styling: large labels that follow the text-size preference, >= 44dp tall tabs (NFR 2.1, 2.2).
import type { BottomTabNavigationOptions } from '@react-navigation/bottom-tabs';
import type { Theme } from '../design';

export function tabScreenOptions(theme: Theme): BottomTabNavigationOptions {
  const label = theme.text('caption');
  return {
    headerShown: false,
    tabBarActiveTintColor: theme.colors.primary,
    tabBarInactiveTintColor: theme.colors.textMuted,
    tabBarLabelStyle: { fontSize: label.fontSize, fontWeight: '700' },
    tabBarIconStyle: { display: 'none' },
    tabBarStyle: { minHeight: theme.sizes.minTouchTarget + theme.spacing.lg },
    tabBarItemStyle: { minHeight: theme.sizes.minTouchTarget, justifyContent: 'center' },
  };
}
