// UC #3-3 roster view models, derived from the callable's output type.
import type { CallableOutput } from '@silveracademy/shared';

export type Roster = CallableOutput<'bookings-getRoster'>;
export type RosterLearner = Roster['learners'][number];
