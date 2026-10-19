// UC #3-3 tests for roster helpers.
import { countAttended, isAttended } from './rosterLogic';
import type { RosterLearner } from '../rosterTypes';

const mk = (status: RosterLearner['status']): RosterLearner => ({
  bookingId: status,
  learnerName: 'A',
  status,
});

describe('roster helpers', () => {
  it('counts only ATTENDED learners', () => {
    expect(countAttended([mk('CONFIRMED'), mk('ATTENDED'), mk('ATTENDED')])).toBe(2);
    expect(countAttended([])).toBe(0);
  });
  it('flags attended rows', () => {
    expect(isAttended(mk('ATTENDED'))).toBe(true);
    expect(isAttended(mk('CONFIRMED'))).toBe(false);
  });
});
