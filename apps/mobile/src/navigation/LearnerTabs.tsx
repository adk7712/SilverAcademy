// Learner shell tabs: Discover, My Bookings, Report, Profile. Screens are owned by the feature in the comment.
import { useMemo } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useTheme } from '../design';
import { strings } from '../i18n';
import { DiscoverScreen, WorkshopDetailScreen } from '../features/workshops';
import { MyBookingsScreen, TicketScreen } from '../features/bookings';
import { createStack } from './createStack';
import { tabScreenOptions } from './tabOptions';
import { ProfileStack, ReportStack } from './sharedStacks';

const Tab = createBottomTabNavigator();
const DiscoverStack = createStack([
  { name: 'DiscoverHome', component: DiscoverScreen }, // workshops (2.2)
  { name: 'WorkshopDetail', component: WorkshopDetailScreen }, // workshops (2.2)
]);
const MyBookingsStack = createStack([
  { name: 'MyBookingsHome', component: MyBookingsScreen }, // bookings (2.2)
  { name: 'Ticket', component: TicketScreen }, // bookings (2.2)
]);

export function LearnerTabs() {
  const theme = useTheme();
  const options = useMemo(() => tabScreenOptions(theme), [theme]);
  return (
    <Tab.Navigator screenOptions={options}>
      <Tab.Screen
        name="DiscoverTab"
        component={DiscoverStack}
        options={{ title: strings.nav.tabs.discover }}
      />
      <Tab.Screen
        name="MyBookingsTab"
        component={MyBookingsStack}
        options={{ title: strings.nav.tabs.myBookings }}
      />
      <Tab.Screen
        name="ReportTab"
        component={ReportStack}
        options={{ title: strings.nav.tabs.report }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileStack}
        options={{ title: strings.nav.tabs.profile }}
      />
    </Tab.Navigator>
  );
}
