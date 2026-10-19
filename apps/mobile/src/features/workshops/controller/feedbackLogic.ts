// UC #2-4 pure feedback rules mirrored from the server (window = endAt + FEEDBACK_WINDOW_DAYS; server is authoritative).
import {
  FEEDBACK_COMMENT_MAX,
  FEEDBACK_RATING_MAX,
  FEEDBACK_RATING_MIN,
  FEEDBACK_TAGS_MAX,
  FEEDBACK_WINDOW_DAYS,
} from '@silveracademy/shared';
import type { AttendedWorkshop, FeedbackState } from '../feedbackTypes';

const MS_PER_DAY = 86_400_000;

export const feedbackDeadline = (endAt: Date): Date =>
  new Date(endAt.getTime() + FEEDBACK_WINDOW_DAYS * MS_PER_DAY);

export function feedbackState(
  w: AttendedWorkshop,
  submittedIds: ReadonlySet<string>,
  now: Date,
): FeedbackState {
  if (submittedIds.has(w.workshopId)) return { kind: 'SUBMITTED' };
  const deadline = feedbackDeadline(w.endAt);
  return now.getTime() > deadline.getTime() ? { kind: 'CLOSED' } : { kind: 'OPEN', deadline };
}

/** Open first (soonest deadline), then submitted/closed (most recent first). */
export function sortForFeedback(
  items: readonly AttendedWorkshop[],
  submittedIds: ReadonlySet<string>,
  now: Date,
): AttendedWorkshop[] {
  const open = items
    .filter((w) => feedbackState(w, submittedIds, now).kind === 'OPEN')
    .sort((a, b) => a.endAt.getTime() - b.endAt.getTime());
  const rest = items
    .filter((w) => feedbackState(w, submittedIds, now).kind !== 'OPEN')
    .sort((a, b) => b.endAt.getTime() - a.endAt.getTime());
  return [...open, ...rest];
}

export type FeedbackDraftError = 'RATING_REQUIRED' | null;

export interface FeedbackDraft {
  rating: number | null;
  comment: string;
  tags: readonly string[];
}

export function validateFeedback(d: FeedbackDraft): FeedbackDraftError {
  if (d.rating === null || d.rating < FEEDBACK_RATING_MIN || d.rating > FEEDBACK_RATING_MAX) {
    return 'RATING_REQUIRED';
  }
  return null;
}

/** Toggles a tag, capping the selection at FEEDBACK_TAGS_MAX. */
export function toggleTag(tags: readonly string[], tag: string): string[] {
  if (tags.includes(tag)) return tags.filter((t) => t !== tag);
  return tags.length >= FEEDBACK_TAGS_MAX ? [...tags] : [...tags, tag];
}

export const clampComment = (text: string): string => text.slice(0, FEEDBACK_COMMENT_MAX);
