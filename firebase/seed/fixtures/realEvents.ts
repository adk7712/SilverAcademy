// Seed real events (issue #2): public onePA listings at their real venues, kept apart from the fictional demo data.
// Each is OPEN on a BOOKED slot with an APPROVED request; instructor, capacities and amenities are demo values.
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
    capacity: 30,
    amenities: ['Wheelchair access', 'Air-conditioned'],
  },
  {
    key: 'changi-simei-cc',
    name: 'Changi Simei Community Club',
    address: '10 Simei Street 2, Singapore 529915',
    postalCode: '529915',
    // OneMap search for 529915.
    lat: 1.34497,
    lng: 103.95517,
    capacity: 40,
    amenities: ['Wheelchair access', 'Lift access'],
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
  {
    key: 'changi-simei-cc-1',
    facilityKey: 'changi-simei-cc',
    startsAt: '2026-12-12T14:00:00+08:00',
    durationHours: 2.5,
    status: 'BOOKED',
    workshopId: 'ws-real-02',
  },
];

export const REAL_REQUEST_SPECS: readonly RequestSpec[] = [
  { id: 'vr-real-01', workshopId: 'ws-real-01', slotKey: 'ayer-rajah-cc-1', status: 'APPROVED' },
  { id: 'vr-real-02', workshopId: 'ws-real-02', slotKey: 'changi-simei-cc-1', status: 'APPROVED' },
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
  {
    id: 'ws-real-02',
    instructor: 'instructorMary',
    title: "Christmas @ Changi Simei 2026 - Let's Jingle & Mingle",
    description:
      'Celebrate Christmas with a snow party, carnival games, a bouncy castle, snack and handicraft booths, and live ' +
      'performances at the Level 2 MPH and Civic Plaza. Organised by Changi Simei CC. Tickets are $3 per person ' +
      'with a door gift, bought through onePA; priority for Changi Simei residents.',
    category: 'OTHER',
    capacity: 30,
    materials: 'Show the ticket QR code from your email at the registration desk.',
    status: 'OPEN',
    needsVolunteers: false,
    volunteerSlots: 0,
    realEvent: {
      organiser: 'Changi Simei CC',
      sourceUrl:
        'https://www.onepa.gov.sg/events/christmas-changi-simei-2026-let-s-jingle-mingle-e23617380',
    },
  },
];
