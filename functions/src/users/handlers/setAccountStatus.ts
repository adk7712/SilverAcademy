// users-setAccountStatus (UC #5-1): admin flag / unflag / suspend / reactivate (ADR-021).
import { defineCallable, getAdminAuth } from '../../common';
import { setAccountStatus } from '../repo/accountRepo';

export const setAccountStatusCallable = defineCallable(
  'users-setAccountStatus',
  { roles: ['ADMIN'], auditOnDeny: true },
  async ({ input, caller, db }) => setAccountStatus(db, getAdminAuth(), caller, input),
);
