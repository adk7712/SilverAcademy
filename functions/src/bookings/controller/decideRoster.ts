// UC #3-3 (volunteer) and SI class list: roster access decision and output mapping (functions.md 4 bookings-getRoster).
import {
  AppError,
  type Booking,
  type Role,
  type TimestampLike,
  type VolunteerAssignment,
  type Workshop,
} from '@silveracademy/shared';

export interface RosterCaller {
  uid: string;
  roles: readonly Role[];
}

/** Bookings shown on a roster (CANCELLED are hidden). */
export const ROSTER_BOOKING_STATUSES = ['CONFIRMED', 'ATTENDED'] as const;

/**
 * Order: NOT_FOUND -> allowed if ADMIN, owning SI, or ASSIGNED volunteer -> otherwise NOT_ASSIGNED when the caller
 * holds VOLUNTEER (#3-3 Ex1), else PERMISSION_DENIED (SI not owner).
 */
export function decideRosterAccess(
  workshop: Workshop | undefined,
  caller: RosterCaller,
  assignment: VolunteerAssignment | undefined,
): Workshop {
  if (!workshop) throw new AppError('NOT_FOUND');
  const has = (r: Role) => caller.roles.includes(r);
  if (has('ADMIN')) return workshop;
  if (has('SENIOR_INSTRUCTOR') && workshop.instructorId === caller.uid) return workshop;
  if (has('VOLUNTEER') && assignment?.status === 'ASSIGNED') return workshop;
  if (has('VOLUNTEER')) throw new AppError('NOT_ASSIGNED');
  throw new AppError('PERMISSION_DENIED');
}

const iso = (t: TimestampLike | null | undefined) => (t ? t.toDate().toISOString() : null);

/** Pure mapping to the callable output. Never includes `qrPayload` or `ticketCode` (review H1: learners read their own code to staff). Learners sorted by name. */
export function buildRoster(
  workshopId: string,
  workshop: Workshop,
  bookings: Booking[],
  volunteers: VolunteerAssignment[],
) {
  const learners = bookings
    .filter((b) => (ROSTER_BOOKING_STATUSES as readonly string[]).includes(b.status))
    .map((b) => ({
      bookingId: b.id,
      learnerName: b.learnerName,
      status: b.status,
      ...(b.attendedAt ? { attendedAt: b.attendedAt.toDate().toISOString() } : {}),
    }))
    .sort((a, b) => a.learnerName.localeCompare(b.learnerName));
  return {
    workshop: {
      id: workshopId,
      title: workshop.title,
      startAt: iso(workshop.startAt),
      endAt: iso(workshop.endAt),
      venue: workshop.venue ? { name: workshop.venue.name, address: workshop.venue.address } : null,
      capacity: workshop.capacity,
      seatsTaken: workshop.seatsTaken,
      attendedCount: workshop.attendedCount,
    },
    learners,
    volunteers: volunteers
      .filter((v) => v.status === 'ASSIGNED')
      .map((v) => ({ volunteerId: v.volunteerId, volunteerName: v.volunteerName })),
  };
}
