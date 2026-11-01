// Seed real events (workstream G, issue #2): public onePA listings at their real venues, kept apart from the fictional
// demo data. Each real event is an OPEN workshop on a BOOKED slot with an APPROVED venue request, so every existing flow
// works. Taught by a seed instructor for demo purposes; capacity is a demo value (onePA does not publish it).
import type { FacilitySpec, RequestSpec, SlotSpec } from './venues';
import type { WorkshopSpec } from './workshopSpecs';

export const REAL_FACILITY_SPECS: readonly FacilitySpec[] = [
  {
    key: 'ayer-rajah-cc',
    name: 'Ayer Rajah Community Club',
    address: '150 Pandan Gardens, Singapore 609335',
    postalCode: '609335',
    // OneMap search for 609335.
    lat: 1.32096,
    lng: 103.7477,
    // Demo values: the CC's real capacity and amenities are not published here.
    capacity: 30,
    amenities: ['Wheelchair access', 'Air-conditioned'],
  },
];

export const REAL_SLOT_SPECS: readonly SlotSpec[] = [
  {
    key: 'ayer-rajah-cc-1',
    facilityKey: 'ayer-rajah-cc',
    // Fixed date from the English onePA listing (the Chinese listing says 17 Oct).
    startsAt: '2026-11-21T10:00:00+08:00',
    durationHours: 2,
    status: 'BOOKED',
    workshopId: 'ws-real-01',
  },
];

export const REAL_REQUEST_SPECS: readonly RequestSpec[] = [
  { id: 'vr-real-01', workshopId: 'ws-real-01', slotKey: 'ayer-rajah-cc-1', status: 'APPROVED' },
];

export const REAL_WORKSHOP_SPECS: readonly WorkshopSpec[] = [
  {
    id: 'ws-real-01',
    instructor: 'instructorAhmad',
    title: 'Digital Club @ Ayer Rajah: Transact Online with Singpass',
    description:
      'Set up and use Singpass for citizen services online, with guidance in a friendly group. ' +
      "Organised by onePA (People's Association). Open to Singaporeans and PRs aged 40 and above.",
    category: 'DIGITAL_SKILLS',
    capacity: 20,
    materials: 'Bring your charged phone with the Singpass app installed.',
    status: 'OPEN',
    needsVolunteers: false,
    volunteerSlots: 0,
    realEvent: {
      organiser: "onePA (People's Association)",
      sourceUrl:
        'https://www.onepa.gov.sg/events/digital-club-ayer-rajah-singpass-21112026-24283405',
    },
  },
];
