// reports-submitReport (UC #2-5): Learner / Senior Instructor / Volunteer files an incident report.
import { defineCallable } from '../../common';
import { submitReport } from '../repo/incidentRepo';

export const submitReportCallable = defineCallable(
  'reports-submitReport',
  { roles: ['LEARNER', 'SENIOR_INSTRUCTOR', 'VOLUNTEER'] },
  async ({ input, caller, db, now }) => submitReport(db, caller, input, now),
);
