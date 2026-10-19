// UC #2-2 #2-3 #1-4 #3-4 bookings and attendance entities.
import type { AttendanceMethod, AttendanceStaffRole, BookingStatus } from '../enums';
import type { TimestampLike, Timestamps } from './common';

export interface WorkshopSnapshot {
  title: string;
  startAt: TimestampLike;
  endAt: TimestampLike;
  venueName: string;
  venueAddress: string;
  instructorName: string;
}

/** bookings/{workshopId}_{learnerId}; this IS the digital ticket. */
export interface Booking extends Timestamps {
  id: string;
  workshopId: string;
  learnerId: string;
  learnerName: string;
  status: BookingStatus;
  ticketCode: string;
  qrPayload: string;
  workshopSnapshot: WorkshopSnapshot;
  attendedAt?: TimestampLike;
}

/** attendance/{bookingId}: once-only by deterministic id. */
export interface Attendance {
  bookingId: string;
  workshopId: string;
  learnerId: string;
  learnerName: string;
  instructorId: string;
  scannedBy: string;
  scannedByRole: AttendanceStaffRole;
  method: AttendanceMethod;
  pointsAwarded: number;
  createdAt: TimestampLike;
}
