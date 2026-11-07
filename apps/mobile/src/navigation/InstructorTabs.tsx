// Instructor shell tabs: Dashboard (direct access to Create Workshop, Scan Attendance, Wallet), Report, Profile.
import { useMemo } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useTheme } from '../design';
import { strings } from '../i18n';
import { CreateWorkshopScreen, InstructorDashboardScreen } from '../features/workshops';
import { VenueRequestScreen } from '../features/venues';
import { InstructorProfileScreen } from '../features/users';
import { RosterScreen } from '../features/bookings';
import { ScanAttendanceScreen } from '../features/attendance';
import { MyVouchersScreen, RedeemVoucherScreen, WalletScreen } from '../features/vouchers';
import { createStack } from './createStack';
import { tabScreenOptions } from './tabOptions';
import { ProfileStack, ReportStack } from './sharedStacks';

const Tab = createBottomTabNavigator();
const DashboardStack = createStack([
  { name: 'InstructorDashboard', component: InstructorDashboardScreen }, // workshops (2.3)
  { name: 'CreateWorkshop', component: CreateWorkshopScreen }, // workshops (2.3)
  { name: 'VenueRequest', component: VenueRequestScreen }, // venues (2.3)
  { name: 'InstructorProfileForm', component: InstructorProfileScreen }, // users (2.3)
  { name: 'ScanAttendance', component: ScanAttendanceScreen }, // attendance (2.4)
  { name: 'Roster', component: RosterScreen }, // bookings (2.4)
  { name: 'Wallet', component: WalletScreen }, // vouchers (2.5)
  { name: 'RedeemVoucher', component: RedeemVoucherScreen }, // vouchers (2.5)
  { name: 'MyVouchers', component: MyVouchersScreen }, // vouchers (2.5)
]);

export function InstructorTabs() {
  const theme = useTheme();
  const options = useMemo(() => tabScreenOptions(theme), [theme]);
  return (
    <Tab.Navigator screenOptions={options}>
      <Tab.Screen
        name="DashboardTab"
        component={DashboardStack}
        options={{ title: strings.nav.tabs.dashboard }}
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
