// Constants invariants (architecture.md section 7). Cross-cutting.
import {
  FEEDBACK_RATING_MAX,
  FEEDBACK_RATING_MIN,
  FONT_SCALES,
  MS_PER_HOUR,
  MS_PER_MINUTE,
} from './constants';

describe('shared constants', () => {
  it('derived constants stay consistent', () => {
    expect(MS_PER_HOUR).toBe(60 * MS_PER_MINUTE);
    expect(FEEDBACK_RATING_MIN).toBe(1);
    expect(FEEDBACK_RATING_MAX).toBe(5);
    expect([...FONT_SCALES]).toEqual([...FONT_SCALES].sort((a, b) => a - b));
  });
});
