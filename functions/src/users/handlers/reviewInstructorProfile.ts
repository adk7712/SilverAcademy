// users-reviewInstructorProfile (UC #5-5): admin approves / rejects / requests revision.
import { defineCallable } from '../../common';
import { reviewInstructorProfile } from '../repo/instructorProfileRepo';

export const reviewInstructorProfileCallable = defineCallable(
  'users-reviewInstructorProfile',
  { roles: ['ADMIN'], auditOnDeny: true },
  async ({ input, caller, db }) => reviewInstructorProfile(db, caller, input),
);
