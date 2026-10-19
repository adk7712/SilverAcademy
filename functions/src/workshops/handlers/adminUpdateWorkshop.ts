// workshops-adminUpdateWorkshop (UC #5-2): admin edits workshop details; capacity rules; audited.
import { defineCallable } from '../../common';
import { adminUpdateWorkshop } from '../repo/adminWorkshopRepo';

export const adminUpdateWorkshopCallable = defineCallable(
  'workshops-adminUpdateWorkshop',
  { roles: ['ADMIN'], auditOnDeny: true },
  async ({ input, caller, db, now }) => adminUpdateWorkshop(db, caller, input, now),
);
