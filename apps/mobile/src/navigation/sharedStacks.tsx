// Stacks shared by several shells: Profile (ProfileHome + ReportIssue) and the Report tab.
import { ReportIssueScreen } from '../features/reports';
import { ProfileScreen } from '../features/users';
import { FeedbackScreen } from '../features/workshops';
import { createStack } from './createStack';

export const ProfileStack = createStack([
  { name: 'ProfileHome', component: ProfileScreen }, // users
  { name: 'ReportIssue', component: ReportIssueScreen }, // reports (2.10)
  { name: 'Feedback', component: FeedbackScreen }, // workshops feedback (2.6)
]);
export const ReportStack = createStack([{ name: 'ReportHome', component: ReportIssueScreen }]); // reports (2.10)
