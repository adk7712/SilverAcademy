// UC #2-4 SubmitFeedback: pure decision for workshops-submitFeedback (ADR-022). No Firebase imports.
import { AppError, FEEDBACK_WINDOW_DAYS, type Workshop } from '@silveracademy/shared';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export interface FeedbackSnapshots {
  workshop: Pick<Workshop, 'endAt'> | undefined;
  /** attendance/{bookingId} exists (and belongs to this workshop) */
  attended: boolean;
  /** feedback/{bookingId} already exists */
  alreadySubmitted: boolean;
}

/**
 * Check order: workshop missing -> NOT_FOUND; no attendance record -> NOT_ATTENDED;
 * `now > endAt + FEEDBACK_WINDOW_DAYS` -> FEEDBACK_WINDOW_CLOSED; feedback exists -> ALREADY_SUBMITTED.
 */
export function decideFeedback(s: FeedbackSnapshots, now: Date): void {
  if (!s.workshop) throw new AppError('NOT_FOUND');
  if (!s.attended || !s.workshop.endAt) throw new AppError('NOT_ATTENDED');
  const closesAt = s.workshop.endAt.toDate().getTime() + FEEDBACK_WINDOW_DAYS * MS_PER_DAY;
  if (now.getTime() > closesAt) throw new AppError('FEEDBACK_WINDOW_CLOSED');
  if (s.alreadySubmitted) throw new AppError('ALREADY_SUBMITTED');
}
