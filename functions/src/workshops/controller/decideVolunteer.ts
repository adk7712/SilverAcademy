// UC #3-2 AssistWorkshop: pure rules for volunteer opt-in and withdrawal (ADR-014). No Firebase imports.
import { AppError, type VolunteerAssignment, type Workshop } from '@silveracademy/shared';

type WorkshopForOptIn = Pick<
  Workshop,
  'status' | 'needsVolunteers' | 'volunteerSlots' | 'volunteersAssigned' | 'startAt'
>;

/**
 * Order (architecture 4.7): workshop missing -> NOT_FOUND; existing ASSIGNED -> ALREADY_OPTED_IN {status};
 * not OPEN / !needsVolunteers / already started -> NOT_ACCEPTING_VOLUNTEERS; no free slot -> VOLUNTEERS_FULL.
 * A WITHDRAWN assignment may opt in again.
 */
export function decideOptIn(
  workshop: WorkshopForOptIn | undefined,
  existing: Pick<VolunteerAssignment, 'status'> | undefined,
  now: Date,
): void {
  if (!workshop) throw new AppError('NOT_FOUND');
  if (existing?.status === 'ASSIGNED') {
    throw new AppError('ALREADY_OPTED_IN', undefined, { status: existing.status });
  }
  const started = !workshop.startAt || workshop.startAt.toDate().getTime() <= now.getTime();
  if (workshop.status !== 'OPEN' || !workshop.needsVolunteers || started) {
    throw new AppError('NOT_ACCEPTING_VOLUNTEERS');
  }
  if (workshop.volunteersAssigned >= workshop.volunteerSlots) throw new AppError('VOLUNTEERS_FULL');
}

/** Order: no ASSIGNED record -> NOT_ASSIGNED; workshop missing -> NOT_FOUND; started -> WORKSHOP_STARTED. */
export function decideWithdraw(
  assignment: Pick<VolunteerAssignment, 'status'> | undefined,
  workshop: Pick<Workshop, 'startAt' | 'volunteersAssigned'> | undefined,
  now: Date,
): { volunteersAssigned: number } {
  if (!assignment || assignment.status !== 'ASSIGNED') throw new AppError('NOT_ASSIGNED');
  if (!workshop) throw new AppError('NOT_FOUND');
  if (!workshop.startAt || workshop.startAt.toDate().getTime() <= now.getTime()) {
    throw new AppError('WORKSHOP_STARTED');
  }
  return { volunteersAssigned: Math.max(0, workshop.volunteersAssigned - 1) };
}
