// UC #1-4, #3-4 ScanAttendance: pure attendance rules (architecture.md 4.3). No Firebase imports.
import {
  AppError,
  POINTS_PER_ATTENDANCE,
  isCheckInWindowOpen,
  type Attendance,
  type AttendanceMethod,
  type AttendanceStaffRole,
  type Booking,
  type Role,
  type TimestampLike,
  type VolunteerAssignment,
  type Workshop,
} from '@silveracademy/shared';

/** Workshop statuses during which attendance may be recorded. */
const ACTIVE_WORKSHOP_STATUSES: readonly Workshop['status'][] = ['OPEN', 'COMPLETED'];

export interface AttendanceSnapshots {
  workshop: Workshop | undefined;
  booking: Booking | undefined;
  attendance: Attendance | undefined;
  /** volunteerAssignments/{workshopId}_{uid}; only read when the scanner is not the instructor. */
  assignment: VolunteerAssignment | undefined;
}

export interface AttendanceRequest {
  workshopId: string;
  bookingId: string;
  method: AttendanceMethod;
  scanner: { uid: string; roles: readonly Role[] };
  /** DEMO_IGNORE_CHECKIN_WINDOW (ADR-009). */
  ignoreCheckInWindow: boolean;
}

export interface AttendanceDecision {
  scannedByRole: AttendanceStaffRole;
  /** Attendance doc body without `createdAt` (the repo stamps it). */
  record: Omit<Attendance, 'createdAt'>;
  instructorId: string;
  workshopTitle: string;
  learnerName: string;
  pointsAwarded: number;
}

/** Which input path was used: QR payload or manual ticket code (#1-4 Ex4). */
export const methodOf = (
  input: { qrPayload: string } | { ticketCode: string },
): AttendanceMethod => ('qrPayload' in input ? 'QR' : 'MANUAL');

const toIso = (t: TimestampLike | undefined | null): string | undefined =>
  t ? t.toDate().toISOString() : undefined;

/** Step 2: workshop instructor (SI) or an ASSIGNED volunteer; else NOT_AUTHORISED_FOR_WORKSHOP. */
function decideScannerRole(
  workshop: Workshop,
  scanner: AttendanceRequest['scanner'],
  assignment: VolunteerAssignment | undefined,
): AttendanceStaffRole {
  if (scanner.uid === workshop.instructorId && scanner.roles.includes('SENIOR_INSTRUCTOR')) {
    return 'SENIOR_INSTRUCTOR';
  }
  if (
    scanner.roles.includes('VOLUNTEER') &&
    assignment?.status === 'ASSIGNED' &&
    assignment.workshopId === workshop.id &&
    assignment.volunteerId === scanner.uid
  ) {
    return 'VOLUNTEER';
  }
  throw new AppError('NOT_AUTHORISED_FOR_WORKSHOP');
}

/** Step 3: workshop OPEN/COMPLETED and inside the check-in window (unless the demo override is on). */
export function isSessionActive(workshop: Workshop, now: Date, ignoreWindow: boolean): boolean {
  if (!ACTIVE_WORKSHOP_STATUSES.includes(workshop.status)) return false;
  if (ignoreWindow) return true;
  if (!workshop.startAt || !workshop.endAt) return false;
  return isCheckInWindowOpen(workshop.startAt.toDate(), workshop.endAt.toDate(), now);
}

/**
 * Check order is the contract (architecture.md 4.3):
 * NOT_FOUND -> NOT_AUTHORISED_FOR_WORKSHOP -> SESSION_NOT_ACTIVE -> NO_BOOKING -> WRONG_WORKSHOP -> ALREADY_ATTENDED.
 * Points always go to the workshop's instructor, whoever scans (ADR-010).
 */
export function decideAttendance(
  snaps: AttendanceSnapshots,
  req: AttendanceRequest,
  now: Date,
): AttendanceDecision {
  const { workshop, booking, attendance } = snaps;
  if (!workshop) throw new AppError('NOT_FOUND', 'Workshop not found.');
  const scannedByRole = decideScannerRole(workshop, req.scanner, snaps.assignment);
  if (!isSessionActive(workshop, now, req.ignoreCheckInWindow)) {
    throw new AppError('SESSION_NOT_ACTIVE');
  }
  if (!booking || booking.status === 'CANCELLED') throw new AppError('NO_BOOKING');
  if (booking.workshopId !== req.workshopId) throw new AppError('WRONG_WORKSHOP');
  if (attendance || booking.status === 'ATTENDED') {
    const attendedAt = toIso(attendance?.createdAt) ?? toIso(booking.attendedAt);
    throw new AppError('ALREADY_ATTENDED', undefined, {
      learnerName: booking.learnerName,
      ...(attendedAt ? { attendedAt } : {}),
    });
  }
  return {
    scannedByRole,
    instructorId: workshop.instructorId,
    workshopTitle: workshop.title,
    learnerName: booking.learnerName,
    pointsAwarded: POINTS_PER_ATTENDANCE,
    record: {
      bookingId: req.bookingId,
      workshopId: req.workshopId,
      learnerId: booking.learnerId,
      learnerName: booking.learnerName,
      instructorId: workshop.instructorId,
      scannedBy: req.scanner.uid,
      scannedByRole,
      method: req.method,
      pointsAwarded: POINTS_PER_ATTENDANCE,
    },
  };
}
