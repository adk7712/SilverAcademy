// Shared bottom-tab styling: large labels and icons that follow the text-size preference, >= 44dp tall tabs (NFR 2.1, 2.2).
import type { ComponentProps } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { BottomTabNavigationOptions } from '@react-navigation/bottom-tabs';
import type { RouteProp, ParamListBase } from '@react-navigation/native';
import { scaleSize, type Theme } from '../design';

type IoniconName = ComponentProps<typeof Ionicons>['name'];
type TabIcon = NonNullable<BottomTabNavigationOptions['tabBarIcon']>;

// One icon per tab route, shared by every shell so Profile/Report look the same everywhere.
const TAB_ICONS: Record<string, IoniconName> = {
  DiscoverTab: 'search-outline',
  MyBookingsTab: 'calendar-outline',
  DashboardTab: 'grid-outline',
  OpportunitiesTab: 'search-outline',
  AssignedTab: 'clipboard-outline',
  ScanTab: 'scan-outline',
  ReportTab: 'alert-circle-outline',
  ProfileTab: 'person-outline',
};

// Module-level renderers keep option identity stable across renders, so React Navigation can reuse descriptors.
const TAB_ICON_RENDERERS: Record<string, TabIcon> = Object.fromEntries(
  Object.entries(TAB_ICONS).map(([route, name]) => [
    route,
    ({ color, size }: { color: string; size: number }) => (
      <Ionicons name={name} size={size} color={color} />
    ),
  ]),
);

// Bottom-tabs' default icon size and the vertical padding around icon + label.
const BASE_ICON_SIZE = 25;
const ITEM_PADDING = 10;

/**
 * Tab bar options for a shell. The bar height is sized for icon + label at the current text size,
 * plus the bottom safe-area inset (the library default of 49 + inset clips the label).
 */
export function tabScreenOptions(
  theme: Theme,
  bottomInset: number,
): (props: { route: RouteProp<ParamListBase> }) => BottomTabNavigationOptions {
  const label = theme.text('caption');
  const iconSize = scaleSize(BASE_ICON_SIZE, theme.fontScale);
  const contentHeight = Math.max(
    theme.sizes.minTouchTarget + theme.spacing.lg,
    iconSize + (label.lineHeight ?? label.fontSize ?? 0) + ITEM_PADDING,
  );

  const base: BottomTabNavigationOptions = {
    headerShown: false,
    tabBarActiveTintColor: theme.colors.primary,
    tabBarInactiveTintColor: theme.colors.textMuted,

    tabBarLabelPosition: 'below-icon',
    tabBarLabelStyle: {
      fontSize: label.fontSize,
      fontWeight: '700',
    },
    tabBarIconSize: iconSize,

    tabBarStyle: {
      height: contentHeight + bottomInset,
      paddingBottom: bottomInset,
    },
  };

  return ({ route }) => ({ ...base, tabBarIcon: TAB_ICON_RENDERERS[route.name] });
}
