// users-submitInstructorProfile (UC #5-5 submission side, gap 17): senior-eligible instructors submit their profile for review.
import { defineCallable } from '../../common';
import { submitInstructorProfile } from '../repo/instructorProfileRepo';

export const submitInstructorProfileCallable = defineCallable(
  'users-submitInstructorProfile',
  { roles: ['SENIOR_INSTRUCTOR'] },
  async ({ input, caller, db }) => submitInstructorProfile(db, caller, input),
);
