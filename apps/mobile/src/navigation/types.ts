// Route names and param lists for every mobile screen (public to features: use via ./hooks).
// Route names are unique app-wide so `navigate('Ticket', { bookingId })` is typed from anywhere.
import type { NavigatorScreenParams } from '@react-navigation/native';

export type DiscoverStackParams = {
  DiscoverHome: undefined;
  WorkshopDetail: { workshopId: string };
};
export type MyBookingsStackParams = {
  MyBookingsHome: undefined;
  Ticket: { bookingId: string };
};
export type ReportStackParams = { ReportHome: undefined };
export type ProfileStackParams = {
  ProfileHome: undefined;
  ReportIssue: undefined;
  Feedback: undefined;
};
export type InstructorStackParams = {
  InstructorDashboard: undefined;
  CreateWorkshop: undefined;
  VenueRequest: { workshopId: string };
  InstructorProfileForm: undefined;
  ScanAttendance: { workshopId?: string } | undefined;
  Roster: { workshopId: string };
  Wallet: undefined;
  RedeemVoucher: undefined;
  MyVouchers: undefined;
};
export type OpportunitiesStackParams = {
  Opportunities: undefined;
  OpportunityDetail: { workshopId: string };
};
export type AssignedStackParams = { AssignedWorkshops: undefined };
export type VolunteerScanStackParams = { VolunteerScan: undefined };

/** Tab routes of each shell; use these to jump across tabs, e.g. navigate('MyBookingsTab', { screen: 'Ticket', params }). */
export type TabParams = {
  DiscoverTab: NavigatorScreenParams<DiscoverStackParams> | undefined;
  MyBookingsTab: NavigatorScreenParams<MyBookingsStackParams> | undefined;
  ReportTab: NavigatorScreenParams<ReportStackParams> | undefined;
  ProfileTab: NavigatorScreenParams<ProfileStackParams> | undefined;
  DashboardTab: NavigatorScreenParams<InstructorStackParams> | undefined;
  OpportunitiesTab: NavigatorScreenParams<OpportunitiesStackParams> | undefined;
  AssignedTab: NavigatorScreenParams<AssignedStackParams> | undefined;
  ScanTab: NavigatorScreenParams<VolunteerScanStackParams> | undefined;
};

export type AppParamList = DiscoverStackParams &
  MyBookingsStackParams &
  ReportStackParams &
  ProfileStackParams &
  InstructorStackParams &
  OpportunitiesStackParams &
  AssignedStackParams &
  VolunteerScanStackParams &
  TabParams;
