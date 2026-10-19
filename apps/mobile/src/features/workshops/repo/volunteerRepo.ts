// UC #3-1 #3-2 #3-3 Volunteer data access: direct Firestore reads (rules apply) and workshops-* / bookings-getRoster callables.
import {
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  where,
  type DocumentData,
} from 'firebase/firestore';
import type { CallableOutput } from '@silveracademy/shared';
import { callFunction } from '../../../services/callables';
import { firestore } from '../../../services/firebase';
import type { AssignmentView, OpportunityWorkshop } from '../volunteerTypes';

type Rosterv = CallableOutput<'bookings-getRoster'>;

const toDate = (v: unknown): Date | null =>
  v && typeof (v as { toDate?: unknown }).toDate === 'function'
    ? (v as { toDate: () => Date }).toDate()
    : null;

function toWorkshop(id: string, d: DocumentData): OpportunityWorkshop {
  const venue = d.venue as { name: string; address: string; lat: number; lng: number } | null;
  return {
    id,
    title: d.title ?? '',
    description: d.description ?? '',
    instructorName: d.instructorName ?? '',
    materials: d.materials ?? '',
    status: d.status,
    startAt: toDate(d.startAt),
    endAt: toDate(d.endAt),
    venue: venue
      ? { name: venue.name, address: venue.address, lat: venue.lat, lng: venue.lng }
      : null,
    needsVolunteers: Boolean(d.needsVolunteers),
    volunteerSlots: Number(d.volunteerSlots ?? 0),
    volunteersAssigned: Number(d.volunteersAssigned ?? 0),
    seatsTaken: Number(d.seatsTaken ?? 0),
    attendedCount: Number(d.attendedCount ?? 0),
  };
}

/** OPEN workshops soonest first; `needsVolunteers` is filtered in the controller (no extra index). */
export async function listOpenWorkshops(): Promise<OpportunityWorkshop[]> {
  const snap = await getDocs(
    query(collection(firestore, 'workshops'), where('status', '==', 'OPEN'), orderBy('startAt')),
  );
  return snap.docs.map((d) => toWorkshop(d.id, d.data()));
}

/** Null when missing or not readable (e.g. archived). */
export async function getWorkshop(workshopId: string): Promise<OpportunityWorkshop | null> {
  try {
    const snap = await getDoc(doc(firestore, 'workshops', workshopId));
    return snap.exists() ? toWorkshop(snap.id, snap.data()) : null;
  } catch {
    return null;
  }
}

/** Assignment id is `${workshopId}_${uid}` (functions 1.5). */
export async function getMyAssignment(
  workshopId: string,
  uid: string,
): Promise<AssignmentView | null> {
  const snap = await getDoc(doc(firestore, 'volunteerAssignments', `${workshopId}_${uid}`));
  if (!snap.exists()) return null;
  return { workshopId, status: snap.data().status };
}

export async function listMyAssignments(uid: string): Promise<AssignmentView[]> {
  const snap = await getDocs(
    query(collection(firestore, 'volunteerAssignments'), where('volunteerId', '==', uid)),
  );
  return snap.docs.map((d) => ({ workshopId: d.data().workshopId, status: d.data().status }));
}

export const optIn = (workshopId: string) =>
  callFunction('workshops-optInVolunteer', { workshopId });
export const withdraw = (workshopId: string) =>
  callFunction('workshops-withdrawVolunteer', { workshopId });
export const getRoster = (workshopId: string): Promise<Rosterv> =>
  callFunction('bookings-getRoster', { workshopId });
