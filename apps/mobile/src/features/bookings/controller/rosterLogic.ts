// UC #3-3 pure roster helpers: attended count and row status.
import type { RosterLearner } from '../rosterTypes';

export const countAttended = (learners: readonly RosterLearner[]): number =>
  learners.filter((l) => l.status === 'ATTENDED').length;

export const isAttended = (l: RosterLearner): boolean => l.status === 'ATTENDED';
