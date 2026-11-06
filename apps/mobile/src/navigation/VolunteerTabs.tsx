// Volunteer shell tabs: Opportunities, Assigned, Scan, Profile (Profile holds logout and Report an issue).
import { useMemo } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useTheme } from '../design';
import { strings } from '../i18n';
import {
  AssignedWorkshopsScreen,
  VolunteerOpportunitiesScreen,
  VolunteerOpportunityDetailScreen,
} from '../features/workshops';
import { ScanAttendanceScreen } from '../features/attendance';
import { createStack } from './createStack';
import { tabScreenOptions } from './tabOptions';
import { ProfileStack } from './sharedStacks';

const Tab = createBottomTabNavigator();
const OpportunitiesStack = createStack([
  { name: 'Opportunities', component: VolunteerOpportunitiesScreen }, // workshops (2.6)
  { name: 'OpportunityDetail', component: VolunteerOpportunityDetailScreen }, // workshops (2.6)
]);
const AssignedStack = createStack([
  { name: 'AssignedWorkshops', component: AssignedWorkshopsScreen },
]); // workshops (2.6)
const ScanStack = createStack([{ name: 'VolunteerScan', component: ScanAttendanceScreen }]); // attendance (2.4)

export function VolunteerTabs() {
  const theme = useTheme();
  const options = useMemo(() => tabScreenOptions(theme), [theme]);
  return (
    <Tab.Navigator screenOptions={options}>
      <Tab.Screen
        name="OpportunitiesTab"
        component={OpportunitiesStack}
        options={{
          title: strings.nav.tabs.opportunities,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="search-outline" size={size} color={color} />
          ),
        }}
      />

      <Tab.Screen
        name="AssignedTab"
        component={AssignedStack}
        options={{
          title: strings.nav.tabs.assigned,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="clipboard-outline" size={size} color={color} />
          ),
        }}
      />

      <Tab.Screen
        name="ScanTab"
        component={ScanStack}
        options={{
          title: strings.nav.tabs.scan,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="scan-outline" size={size} color={color} />
          ),
        }}
      />

      <Tab.Screen
        name="ProfileTab"
        component={ProfileStack}
        options={{
          title: strings.nav.tabs.profile,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-outline" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}
