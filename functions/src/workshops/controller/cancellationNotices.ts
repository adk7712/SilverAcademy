// UC #5-3 admin workshop cancellation: notification copy per audience. Pure.
export type CancellationAudience = 'LEARNER' | 'VOLUNTEER' | 'INSTRUCTOR';

export function cancellationNotice(
  audience: CancellationAudience,
  workshopTitle: string,
  reason: string,
): { title: string; body: string } {
  const lead: Record<CancellationAudience, string> = {
    LEARNER: 'Your booking has been cancelled.',
    VOLUNTEER: 'The workshop you volunteered for has been cancelled.',
    INSTRUCTOR: 'Your workshop has been cancelled by an admin.',
  };
  return {
    title: `Workshop cancelled: ${workshopTitle}`,
    body: `${lead[audience]} Reason: ${reason}`,
  };
}

/** Learner copy when an admin archives an upcoming OPEN workshop that still has bookings (review L4). */
export function archiveNotice(workshopTitle: string): { title: string; body: string } {
  return {
    title: `Workshop withdrawn: ${workshopTitle}`,
    body: 'This workshop has been withdrawn by an admin and can no longer be checked in. Please contact support if you have questions.',
  };
}
