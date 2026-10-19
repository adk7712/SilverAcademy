// workshops-submitFeedback (UC #2-4, ADR-022): attended learners rate a workshop within the feedback window.
import { defineCallable } from '../../common';
import { submitFeedback } from '../repo/feedbackRepo';

export const submitFeedbackCallable = defineCallable(
  'workshops-submitFeedback',
  { roles: ['LEARNER'] },
  async ({ input, caller, db, now }) => submitFeedback(db, caller, input, now),
);
