// UC #2-4 tests for feedback window, ordering, draft validation and tag toggling.
import { FEEDBACK_TAGS_MAX } from '@silveracademy/shared';
import {
  clampComment,
  feedbackState,
  sortForFeedback,
  toggleTag,
  validateFeedback,
} from './feedbackLogic';

const DAY = 86_400_000;
const NOW = new Date('2026-10-19T00:00:00Z');
const w = (id: string, endDaysAgo: number) => ({
  workshopId: id,
  title: id,
  endAt: new Date(NOW.getTime() - endDaysAgo * DAY),
});

describe('feedbackState', () => {
  it('is open within 7 days, closed after, submitted wins', () => {
    expect(feedbackState(w('a', 6), new Set(), NOW).kind).toBe('OPEN');
    expect(feedbackState(w('a', 8), new Set(), NOW).kind).toBe('CLOSED');
    expect(feedbackState(w('a', 8), new Set(['a']), NOW).kind).toBe('SUBMITTED');
  });
  it('is still open exactly at the deadline', () => {
    expect(feedbackState(w('a', 7), new Set(), NOW).kind).toBe('OPEN');
  });
});

describe('sortForFeedback', () => {
  it('puts open workshops first', () => {
    const sorted = sortForFeedback([w('old', 20), w('new', 1), w('mid', 5)], new Set(), NOW);
    expect(sorted.map((x) => x.workshopId)).toEqual(['mid', 'new', 'old']);
  });
});

describe('draft helpers', () => {
  it('requires a rating', () => {
    expect(validateFeedback({ rating: null, comment: '', tags: [] })).toBe('RATING_REQUIRED');
    expect(validateFeedback({ rating: 6, comment: '', tags: [] })).toBe('RATING_REQUIRED');
    expect(validateFeedback({ rating: 4, comment: '', tags: [] })).toBeNull();
  });
  it('toggles and caps tags', () => {
    expect(toggleTag(['a'], 'a')).toEqual([]);
    const full = Array.from({ length: FEEDBACK_TAGS_MAX }, (_, i) => `t${i}`);
    expect(toggleTag(full, 'extra')).toEqual(full);
  });
  it('clamps long comments', () => {
    expect(clampComment('x'.repeat(5000)).length).toBeLessThanOrEqual(1000);
  });
});
