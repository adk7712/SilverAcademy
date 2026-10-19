// workshops-adminSetStatus (UC #5-2, #5-3 FR 6.20): archive / unarchive / complete / cancel with impact confirmation.
import { defineCallable } from '../../common';
import { adminSetStatus } from '../repo/adminWorkshopRepo';

export const adminSetStatusCallable = defineCallable(
  'workshops-adminSetStatus',
  { roles: ['ADMIN'], auditOnDeny: true },
  async ({ input, caller, db, now }) => adminSetStatus(db, caller, input, now),
);
