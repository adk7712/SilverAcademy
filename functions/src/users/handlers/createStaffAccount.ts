// users-createStaffAccount (UC #5-1 onboarding, gap 17): admin onboards a Community Partner or Admin account.
import { defineCallable, getAdminAuth } from '../../common';
import { createStaffAccount } from '../repo/staffAccountRepo';

export const createStaffAccountCallable = defineCallable(
  'users-createStaffAccount',
  { roles: ['ADMIN'], auditOnDeny: true },
  async ({ input, caller, db }) => createStaffAccount(db, getAdminAuth(), caller, input),
);
