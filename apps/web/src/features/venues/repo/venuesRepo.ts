// UC #4-1 #4-2 venues data access: typed Firestore reads, writes only through callables.
import { collection, getDocs, orderBy, query, where } from 'firebase/firestore';
import type {
  CollectionReference,
  DocumentData,
  FirestoreDataConverter,
  QueryDocumentSnapshot,
} from 'firebase/firestore';
import type {
  CallableInput,
  CallableOutput,
  Facility,
  TimeSlot,
  VenueRequest,
} from '@silveracademy/shared';
import { callFunction, firestore } from '../../../services';

function converter<T extends { id: string }>(): FirestoreDataConverter<T> {
  return {
    toFirestore: (d) => d as unknown as DocumentData,
    fromFirestore: (snap: QueryDocumentSnapshot) =>
      ({ ...snap.data(), id: snap.id }) as unknown as T,
  };
}

const facilitiesRef = (): CollectionReference<Facility> =>
  collection(firestore, 'facilities').withConverter(converter<Facility>());
const slotsRef = (facilityId: string): CollectionReference<TimeSlot> =>
  collection(firestore, 'facilities', facilityId, 'slots').withConverter(converter<TimeSlot>());
const requestsRef = (): CollectionReference<VenueRequest> =>
  collection(firestore, 'venueRequests').withConverter(converter<VenueRequest>());

export async function fetchMyFacilities(partnerId: string): Promise<Facility[]> {
  const snap = await getDocs(query(facilitiesRef(), where('partnerId', '==', partnerId)));
  return snap.docs.map((d) => d.data());
}

export async function fetchSlots(facilityId: string): Promise<TimeSlot[]> {
  const snap = await getDocs(query(slotsRef(facilityId), orderBy('startAt', 'asc')));
  return snap.docs.map((d) => d.data());
}

export async function fetchMyRequests(partnerId: string): Promise<VenueRequest[]> {
  const snap = await getDocs(query(requestsRef(), where('partnerId', '==', partnerId)));
  return snap.docs.map((d) => d.data());
}

export const saveFacility = (input: CallableInput<'venues-upsertFacility'>) =>
  callFunction('venues-upsertFacility', input);
export const saveSlot = (input: CallableInput<'venues-upsertSlot'>) =>
  callFunction('venues-upsertSlot', input);
export const removeSlot = (input: CallableInput<'venues-deleteSlot'>) =>
  callFunction('venues-deleteSlot', input);
export const decideRequest = (
  input: CallableInput<'venues-decideVenueRequest'>,
): Promise<CallableOutput<'venues-decideVenueRequest'>> =>
  callFunction('venues-decideVenueRequest', input);
