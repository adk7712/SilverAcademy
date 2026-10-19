// Seed venues (task 0.5): three Community Partner facilities with SG coordinates, slots in mixed statuses, and venue
// requests. Approved requests lock their slot (BOOKED); the pending request sits on an AVAILABLE slot because requests
// do not hold slots (architecture.md 4.6). UC #1-3, #4-1, #4-2. Venue names and addresses are fictional demo data.
import type { SlotStatus, VenueRequestStatus } from '@silveracademy/shared';
import { COLLECTIONS, facilityDocId, slotDocId } from '../ids';
import { MS_PER_HOUR, sgDateTime, toTs } from '../time';
import { seedDoc, type SeedDoc } from '../types';
import { PARTNER_ORG_NAME, UID, person } from './accounts';
import { workshopSpec } from './workshopSpecs';

export interface FacilitySpec {
  key: string;
  name: string;
  address: string;
  postalCode: string;
  lat: number;
  lng: number;
  capacity: number;
  amenities: string[];
}

export const FACILITY_SPECS: readonly FacilitySpec[] = [
  {
    key: 'toa-payoh',
    name: 'Demo Hall Toa Payoh',
    address: 'Toa Payoh Central (fictional demo venue)',
    postalCode: '310190',
    lat: 1.3343,
    lng: 103.8563,
    capacity: 30,
    amenities: ['Wheelchair access', 'Projector', 'Air-conditioned'],
  },
  {
    key: 'bedok',
    name: 'Demo Room Bedok',
    address: 'Bedok North (fictional demo venue)',
    postalCode: '460123',
    lat: 1.3236,
    lng: 103.93,
    capacity: 20,
    amenities: ['Wheelchair access', 'Hearing loop'],
  },
  {
    key: 'ang-mo-kio',
    name: 'Demo Studio Ang Mo Kio',
    address: 'Ang Mo Kio Avenue (fictional demo venue)',
    postalCode: '560123',
    lat: 1.3691,
    lng: 103.8454,
    capacity: 40,
    amenities: ['Projector', 'Air-conditioned', 'Lift access'],
  },
];

export interface SlotSpec {
  key: string;
  facilityKey: string;
  dayOffset: number;
  startHour: number;
  durationHours: number;
  status: SlotStatus;
  /** Workshop that holds the slot (only for BOOKED slots). */
  workshopId: string | null;
}

export const SLOT_SPECS: readonly SlotSpec[] = [
  {
    key: 'toa-payoh-1',
    facilityKey: 'toa-payoh',
    dayOffset: -7,
    startHour: 10,
    durationHours: 1.5,
    status: 'BOOKED',
    workshopId: 'ws-04',
  },
  {
    key: 'toa-payoh-2',
    facilityKey: 'toa-payoh',
    dayOffset: 2,
    startHour: 10,
    durationHours: 2,
    status: 'BOOKED',
    workshopId: 'ws-01',
  },
  {
    key: 'toa-payoh-3',
    facilityKey: 'toa-payoh',
    dayOffset: 6,
    startHour: 14,
    durationHours: 2,
    status: 'AVAILABLE',
    workshopId: null,
  },
  {
    key: 'toa-payoh-4',
    facilityKey: 'toa-payoh',
    dayOffset: 10,
    startHour: 9,
    durationHours: 2,
    status: 'MAINTENANCE',
    workshopId: null,
  },
  {
    key: 'bedok-1',
    facilityKey: 'bedok',
    dayOffset: 3,
    startHour: 14,
    durationHours: 2,
    status: 'BOOKED',
    workshopId: 'ws-02',
  },
  {
    key: 'bedok-2',
    facilityKey: 'bedok',
    dayOffset: 9,
    startHour: 18,
    durationHours: 1.5,
    status: 'BOOKED',
    workshopId: 'ws-05',
  },
  {
    key: 'bedok-3',
    facilityKey: 'bedok',
    dayOffset: 11,
    startHour: 10,
    durationHours: 2,
    status: 'UNAVAILABLE',
    workshopId: null,
  },
  {
    key: 'bedok-4',
    facilityKey: 'bedok',
    dayOffset: 4,
    startHour: 9,
    durationHours: 1,
    status: 'AVAILABLE',
    workshopId: null,
  },
  {
    key: 'ang-mo-kio-1',
    facilityKey: 'ang-mo-kio',
    dayOffset: 5,
    startHour: 9,
    durationHours: 1.5,
    status: 'BOOKED',
    workshopId: 'ws-03',
  },
  {
    key: 'ang-mo-kio-2',
    facilityKey: 'ang-mo-kio',
    dayOffset: 4,
    startHour: 13,
    durationHours: 2,
    status: 'AVAILABLE',
    workshopId: null,
  },
  {
    key: 'ang-mo-kio-3',
    facilityKey: 'ang-mo-kio',
    dayOffset: 12,
    startHour: 10,
    durationHours: 2,
    status: 'AVAILABLE',
    workshopId: null,
  },
];

export interface RequestSpec {
  id: string;
  workshopId: string;
  slotKey: string;
  status: VenueRequestStatus;
}

export const REQUEST_SPECS: readonly RequestSpec[] = [
  { id: 'vr-01', workshopId: 'ws-04', slotKey: 'toa-payoh-1', status: 'APPROVED' },
  { id: 'vr-02', workshopId: 'ws-01', slotKey: 'toa-payoh-2', status: 'APPROVED' },
  { id: 'vr-03', workshopId: 'ws-02', slotKey: 'bedok-1', status: 'APPROVED' },
  { id: 'vr-04', workshopId: 'ws-05', slotKey: 'bedok-2', status: 'APPROVED' },
  { id: 'vr-05', workshopId: 'ws-03', slotKey: 'ang-mo-kio-1', status: 'APPROVED' },
  { id: 'vr-06', workshopId: 'ws-07', slotKey: 'ang-mo-kio-3', status: 'PENDING' },
];

export const slotForWorkshop = (workshopId: string): SlotSpec | undefined =>
  SLOT_SPECS.find((s) => s.workshopId === workshopId);

export const facilityOfSlot = (slot: SlotSpec): FacilitySpec => {
  const facility = FACILITY_SPECS.find((f) => f.key === slot.facilityKey);
  if (!facility) throw new Error(`Slot ${slot.key} points at unknown facility ${slot.facilityKey}`);
  return facility;
};

export function slotTimes(slot: SlotSpec, now: Date): { startAt: Date; endAt: Date } {
  const startAt = sgDateTime(now, slot.dayOffset, slot.startHour);
  return { startAt, endAt: new Date(startAt.getTime() + slot.durationHours * MS_PER_HOUR) };
}

const approvedRequestForSlot = (slotKey: string): string | null =>
  REQUEST_SPECS.find((r) => r.slotKey === slotKey && r.status === 'APPROVED')?.id ?? null;

/** Facilities, slots and venue requests (docs only). */
export function buildVenueDocs(now: Date): SeedDoc[] {
  const stamp = toTs(now);
  const docs: SeedDoc[] = [];

  for (const f of FACILITY_SPECS) {
    const id = facilityDocId(f.key);
    docs.push(
      seedDoc(`facilities/${id}`, {
        id,
        partnerId: UID.partner,
        orgName: PARTNER_ORG_NAME,
        name: f.name,
        address: f.address,
        postalCode: f.postalCode,
        lat: f.lat,
        lng: f.lng,
        capacity: f.capacity,
        amenities: f.amenities,
        createdAt: stamp,
        updatedAt: stamp,
      }),
    );
  }

  for (const s of SLOT_SPECS) {
    const facilityId = facilityDocId(s.facilityKey);
    const id = slotDocId(s.key);
    const { startAt, endAt } = slotTimes(s, now);
    docs.push(
      seedDoc(`${COLLECTIONS.facilities}/${facilityId}/${COLLECTIONS.slots}/${id}`, {
        id,
        facilityId,
        partnerId: UID.partner,
        startAt: toTs(startAt),
        endAt: toTs(endAt),
        status: s.status,
        bookedWorkshopId: s.workshopId,
        bookedRequestId: approvedRequestForSlot(s.key),
        createdAt: stamp,
        updatedAt: stamp,
      }),
    );
  }

  for (const r of REQUEST_SPECS) {
    const slot = SLOT_SPECS.find((s) => s.key === r.slotKey);
    if (!slot) throw new Error(`Request ${r.id} points at unknown slot ${r.slotKey}`);
    const facility = facilityOfSlot(slot);
    const workshop = workshopSpec(r.workshopId);
    const { startAt, endAt } = slotTimes(slot, now);
    const decided = r.status === 'APPROVED';
    docs.push(
      seedDoc(`${COLLECTIONS.venueRequests}/${r.id}`, {
        id: r.id,
        workshopId: r.workshopId,
        instructorId: UID[workshop.instructor],
        instructorName: person(workshop.instructor).name,
        facilityId: facilityDocId(facility.key),
        facilityName: facility.name,
        partnerId: UID.partner,
        slotId: slotDocId(slot.key),
        slotStartAt: toTs(startAt),
        slotEndAt: toTs(endAt),
        workshopSummary: {
          title: workshop.title,
          description: workshop.description,
          category: workshop.category,
          capacity: workshop.capacity,
          materials: workshop.materials,
        },
        status: r.status,
        ...(decided ? { decidedAt: stamp, decidedBy: UID.partner } : {}),
        createdAt: stamp,
        updatedAt: stamp,
      }),
    );
  }
  return docs;
}
