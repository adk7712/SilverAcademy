// UC #3-3 ViewAssignedWorkshop roster / SI class list: bookings-getRoster callable.
import type { Firestore } from 'firebase-admin/firestore';
import { defineCallable, type Caller } from '../../common';
import { buildRoster, decideRosterAccess } from '../controller/decideRoster';
import {
  getAssignment,
  getWorkshop,
  listAssignedVolunteers,
  listRosterBookings,
} from '../repo/rosterRepo';

export async function getRoster(db: Firestore, caller: Caller, input: { workshopId: string }) {
  const { workshopId } = input;
  const [workshop, assignment] = await Promise.all([
    getWorkshop(db, workshopId),
    caller.roles.includes('VOLUNTEER')
      ? getAssignment(db, workshopId, caller.uid)
      : Promise.resolve(undefined),
  ]);
  const allowed = decideRosterAccess(workshop, caller, assignment);
  const [bookings, volunteers] = await Promise.all([
    listRosterBookings(db, workshopId),
    listAssignedVolunteers(db, workshopId),
  ]);
  return buildRoster(workshopId, allowed, bookings, volunteers);
}

export const getRosterCallable = defineCallable(
  'bookings-getRoster',
  { roles: ['SENIOR_INSTRUCTOR', 'VOLUNTEER', 'ADMIN'] },
  async ({ input, caller, db }) => getRoster(db, caller, input),
);
