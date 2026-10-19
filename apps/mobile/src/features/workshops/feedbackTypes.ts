// UC #2-4 view models for the learner feedback screen.
export interface AttendedWorkshop {
  workshopId: string;
  title: string;
  endAt: Date;
}

export type FeedbackState =
  { kind: 'OPEN'; deadline: Date } | { kind: 'SUBMITTED' } | { kind: 'CLOSED' };
