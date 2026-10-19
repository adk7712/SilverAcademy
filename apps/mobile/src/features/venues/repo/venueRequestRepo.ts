// UC #1-3 venue browse and own request reads (direct Firestore, rules-bound) plus venues-* callables.
import {
  Timestamp,
  collection,
  collectionGroup,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  where,
} from 'firebase/firestore';
import type { Facility, TimeSlot, VenueRequest, Workshop } from '@silveracademy/shared';
import { callFunction } from '../../../services/callables';
import { firestore } from '../../../services/firebase';

const SLOT_QUERY_LIMIT = 300;

export async function fetchWorkshop(workshopId: string): Promise<Workshop | null> {
  const snap = await getDoc(doc(firestore, 'workshops', workshopId));
  return snap.exists() ? { ...(snap.data() as Workshop), id: snap.id } : null;
}

export async function fetchFacilities(): Promise<Facility[]> {
  const snap = await getDocs(collection(firestore, 'facilities'));
  return snap.docs.map((d) => ({ ...(d.data() as Facility), id: d.id }));
}

/** Collection-group `slots` (status + startAt index); grouped by facility in the controller. */
export async function fetchAvailableSlots(now: Date): Promise<TimeSlot[]> {
  const q = query(
    collectionGroup(firestore, 'slots'),
    where('status', '==', 'AVAILABLE'),
    where('startAt', '>=', Timestamp.fromDate(now)),
    orderBy('startAt'),
    limit(SLOT_QUERY_LIMIT),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ ...(d.data() as TimeSlot), id: d.id }));
}

export async function fetchRequestsForWorkshop(
  uid: string,
  workshopId: string,
): Promise<VenueRequest[]> {
  const q = query(
    collection(firestore, 'venueRequests'),
    where('instructorId', '==', uid),
    where('workshopId', '==', workshopId),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ ...(d.data() as VenueRequest), id: d.id }));
}

export const requestVenue = (workshopId: string, facilityId: string, slotId: string) =>
  callFunction('venues-requestVenue', { workshopId, facilityId, slotId });
export const respondToInfoRequest = (requestId: string, message: string) =>
  callFunction('venues-respondToInfoRequest', { requestId, message });
export const withdrawVenueRequest = (requestId: string) =>
  callFunction('venues-withdrawVenueRequest', { requestId });
