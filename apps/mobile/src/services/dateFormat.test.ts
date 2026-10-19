// UC #2-1 tests for date/time range text built from i18n templates.
import { formatRange } from './dateFormat';
import { formatWhen } from '../features/workshops/controller/formatWhen';

const start = new Date('2026-11-01T02:00:00Z');
const end = new Date('2026-11-01T04:00:00Z');

describe('range formatting', () => {
  it('formatRange joins times with a dash after the date', () => {
    expect(formatRange(start, end)).toMatch(/2026, 10:00 am - 12:00 pm$/i);
  });
  it('formatWhen joins start and end with "to"', () => {
    expect(formatWhen(start, end)).toMatch(/10:00 am to 12:00 pm$/i);
    expect(formatWhen(start, null)).not.toContain(' to ');
    expect(formatWhen(null, null)).toBe('');
  });
});
