// UC #3-3 roster reads (functions.md 4 bookings-getRoster). Plain reads; no business rules here.
import type { Firestore } from 'firebase-admin/firestore';
import type { Booking, VolunteerAssignment, Workshop } from '@silveracademy/shared';
import { COL, converter, ids, refs } from '../../common';
import { ROSTER_BOOKING_STATUSES } from '../controller/decideRoster';

const assignments = (db: Firestore) =>
  db.collection(COL.volunteerAssignments).withConverter(converter<VolunteerAssignment>());

export async function getWorkshop(
  db: Firestore,
  workshopId: string,
): Promise<Workshop | undefined> {
  return (await refs.workshops(db).doc(workshopId).get()).data();
}

export async function getAssignment(
  db: Firestore,
  workshopId: string,
  volunteerId: string,
): Promise<VolunteerAssignment | undefined> {
  return (await assignments(db).doc(ids.volunteerAssignment(workshopId, volunteerId)).get()).data();
}

/** Uses the `bookings (workshopId, status)` composite index. */
export async function listRosterBookings(db: Firestore, workshopId: string): Promise<Booking[]> {
  const snap = await refs
    .bookings(db)
    .where('workshopId', '==', workshopId)
    .where('status', 'in', [...ROSTER_BOOKING_STATUSES])
    .get();
  return snap.docs.map((d) => d.data());
}

export async function listAssignedVolunteers(
  db: Firestore,
  workshopId: string,
): Promise<VolunteerAssignment[]> {
  const snap = await assignments(db)
    .where('workshopId', '==', workshopId)
    .where('status', '==', 'ASSIGNED')
    .get();
  return snap.docs.map((d) => d.data());
}
