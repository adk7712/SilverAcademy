// Seed bookings, attendance, feedback and a volunteer assignment (task 0.5). UC #2-2, #1-4, #2-4, #1-2 (volunteer opt-in).
// Ticket codes are fixed Crockford strings (validated with isValidTicketCode). QR payloads use the dev HMAC secret, so
// seeded tickets scan against emulator functions that share the same QR_HMAC_SECRET.
import {
  POINTS_PER_ATTENDANCE,
  buildQrPayload,
  isValidTicketCode,
  type Attendance,
  type Booking,
  type Feedback,
  type VolunteerAssignment,
} from '@silveracademy/shared';
import { COLLECTIONS, assignmentDocId, bookingDocId, qrSignature } from '../ids';
import { shiftDays, shiftMinutes, toTs } from '../time';
import { seedDoc, type SeedDoc } from '../types';
import { person, type PersonKey } from './accounts';
import { facilityOfSlot, slotForWorkshop, slotTimes } from './venues';
import { workshopSpec } from './workshopSpecs';

interface BookingSpec {
  workshopId: string;
  learner: PersonKey;
  ticketCode: string;
  /** Local union: shared BookingStatus currently resolves to string (see handoff 0.5). */
  status: 'CONFIRMED' | 'ATTENDED';
}

const BOOKING_SPECS: readonly BookingSpec[] = [
  { workshopId: 'ws-01', learner: 'learner', ticketCode: 'K7Q2M9XA', status: 'CONFIRMED' },
  { workshopId: 'ws-02', learner: 'learnerEdge', ticketCode: 'R4T8NH3V', status: 'CONFIRMED' },
  { workshopId: 'ws-04', learner: 'learnerEdge', ticketCode: 'WB5D6JZP', status: 'ATTENDED' },
];

const ATTENDED_AFTER_START_MINUTES = 10;
const FEEDBACK_AFTER_ATTENDANCE_DAYS = 1;
const FEEDBACK_RATING = 5;
const FEEDBACK_TAGS = ['patient', 'clear'];
const FEEDBACK_COMMENT = 'Clear steps and patient pacing.';

interface VolunteerSpec {
  workshopId: string;
  volunteer: PersonKey;
}

const VOLUNTEER_SPECS: readonly VolunteerSpec[] = [
  { workshopId: 'ws-03', volunteer: 'volunteerPriya' },
];

export interface BookingFacts {
  bookings: Booking[];
  attendance: Attendance[];
  feedback: Feedback[];
  assignments: VolunteerAssignment[];
  docs: SeedDoc[];
}

export function buildBookingFacts(now: Date, qrSecret: string): BookingFacts {
  const stamp = toTs(now);
  const facts: BookingFacts = {
    bookings: [],
    attendance: [],
    feedback: [],
    assignments: [],
    docs: [],
  };

  for (const spec of BOOKING_SPECS) {
    if (!isValidTicketCode(spec.ticketCode))
      throw new Error(`Invalid seed ticket code: ${spec.ticketCode}`);
    const workshop = workshopSpec(spec.workshopId);
    const slot = slotForWorkshop(spec.workshopId);
    if (!slot) throw new Error(`Booking seed needs a slot for ${spec.workshopId}`);
    const { startAt, endAt } = slotTimes(slot, now);
    const facility = facilityOfSlot(slot);
    const learner = person(spec.learner);
    const instructor = person(workshop.instructor);
    const bookingId = bookingDocId(spec.workshopId, learner.uid);
    const attendedAt =
      spec.status === 'ATTENDED' ? shiftMinutes(startAt, ATTENDED_AFTER_START_MINUTES) : null;

    const booking: Booking = {
      id: bookingId,
      workshopId: spec.workshopId,
      learnerId: learner.uid,
      learnerName: learner.name,
      status: spec.status,
      ticketCode: spec.ticketCode,
      qrPayload: buildQrPayload(bookingId, qrSignature(bookingId, qrSecret)),
      workshopSnapshot: {
        title: workshop.title,
        startAt: toTs(startAt),
        endAt: toTs(endAt),
        venueName: facility.name,
        venueAddress: facility.address,
        instructorName: instructor.name,
      },
      ...(attendedAt ? { attendedAt: toTs(attendedAt) } : {}),
      createdAt: stamp,
      updatedAt: stamp,
    };
    facts.bookings.push(booking);
    facts.docs.push(seedDoc(`${COLLECTIONS.bookings}/${bookingId}`, booking));

    if (attendedAt) {
      const attendance: Attendance = {
        bookingId,
        workshopId: spec.workshopId,
        learnerId: learner.uid,
        learnerName: learner.name,
        instructorId: instructor.uid,
        scannedBy: instructor.uid,
        scannedByRole: 'SENIOR_INSTRUCTOR',
        method: 'QR',
        pointsAwarded: POINTS_PER_ATTENDANCE,
        createdAt: toTs(attendedAt),
      };
      facts.attendance.push(attendance);
      facts.docs.push(seedDoc(`${COLLECTIONS.attendance}/${bookingId}`, attendance));

      const feedback: Feedback = {
        bookingId,
        workshopId: spec.workshopId,
        learnerId: learner.uid,
        instructorId: instructor.uid,
        rating: FEEDBACK_RATING,
        comment: FEEDBACK_COMMENT,
        tags: FEEDBACK_TAGS,
        createdAt: toTs(shiftDays(attendedAt, FEEDBACK_AFTER_ATTENDANCE_DAYS)),
      };
      facts.feedback.push(feedback);
      facts.docs.push(seedDoc(`${COLLECTIONS.feedback}/${bookingId}`, feedback));
    }
  }

  for (const spec of VOLUNTEER_SPECS) {
    const workshop = workshopSpec(spec.workshopId);
    const slot = slotForWorkshop(spec.workshopId);
    if (!slot) throw new Error(`Volunteer seed needs a slot for ${spec.workshopId}`);
    const volunteer = person(spec.volunteer);
    const id = assignmentDocId(spec.workshopId, volunteer.uid);
    const assignment: VolunteerAssignment = {
      id,
      workshopId: spec.workshopId,
      volunteerId: volunteer.uid,
      volunteerName: volunteer.name,
      workshopTitle: workshop.title,
      startAt: toTs(slotTimes(slot, now).startAt),
      status: 'ASSIGNED',
      createdAt: stamp,
      updatedAt: stamp,
    };
    facts.assignments.push(assignment);
    facts.docs.push(seedDoc(`${COLLECTIONS.volunteerAssignments}/${id}`, assignment));
  }
  return facts;
}
