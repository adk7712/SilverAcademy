// Seed workshop docs (task 0.5). UC #1-2, #2-1, #5-2. Denormalised counters are derived from the seeded bookings,
// feedback and assignments so they match (architecture.md 2.4). Slot, venue and dates come from venues.ts.
import type {
  Booking,
  Feedback,
  VenueSnapshot,
  Workshop,
  VolunteerAssignment,
} from '@silveracademy/shared';
import { COLLECTIONS, facilityDocId, slotDocId } from '../ids';
import { toTs } from '../time';
import { seedDoc, type SeedDoc } from '../types';
import { UID, person } from './accounts';
import { REQUEST_SPECS, facilityOfSlot, slotForWorkshop, slotTimes } from './venues';
import { WORKSHOP_SPECS } from './workshopSpecs';

export interface WorkshopFacts {
  bookings: Booking[];
  assignments: VolunteerAssignment[];
  feedback: Feedback[];
}

const ACTIVE_REQUEST_STATUSES = ['PENDING', 'AWAITING_INFO'];
const WORKSHOP_SEED_VERSION = 1;

export function buildWorkshopDocs(now: Date, facts: WorkshopFacts): SeedDoc[] {
  const stamp = toTs(now);
  return WORKSHOP_SPECS.map((spec) => {
    const slot = slotForWorkshop(spec.id);
    const bookings = facts.bookings.filter((b) => b.workshopId === spec.id);
    const ratings = facts.feedback.filter((f) => f.workshopId === spec.id);
    const activeRequest = REQUEST_SPECS.find(
      (r) => r.workshopId === spec.id && ACTIVE_REQUEST_STATUSES.includes(r.status),
    );

    let slotFields: Pick<Workshop, 'slotId' | 'startAt' | 'endAt' | 'venue'> = {
      slotId: null,
      startAt: null,
      endAt: null,
      venue: null,
    };
    if (slot) {
      const facility = facilityOfSlot(slot);
      const { startAt, endAt } = slotTimes(slot, now);
      const venue: VenueSnapshot = {
        facilityId: facilityDocId(facility.key),
        name: facility.name,
        address: facility.address,
        postalCode: facility.postalCode,
        lat: facility.lat,
        lng: facility.lng,
        partnerId: UID.partner,
      };
      slotFields = {
        slotId: slotDocId(slot.key),
        startAt: toTs(startAt),
        endAt: toTs(endAt),
        venue,
      };
    }

    const workshop: Workshop = {
      id: spec.id,
      instructorId: UID[spec.instructor],
      instructorName: person(spec.instructor).name,
      title: spec.title,
      description: spec.description,
      category: spec.category,
      capacity: spec.capacity,
      materials: spec.materials,
      status: spec.status,
      seatsTaken: bookings.filter((b) => b.status !== 'CANCELLED').length,
      attendedCount: bookings.filter((b) => b.status === 'ATTENDED').length,
      needsVolunteers: spec.needsVolunteers,
      volunteerSlots: spec.volunteerSlots,
      volunteersAssigned: facts.assignments.filter(
        (a) => a.workshopId === spec.id && a.status === 'ASSIGNED',
      ).length,
      activeVenueRequestId: activeRequest?.id ?? null,
      ...slotFields,
      ratingSum: ratings.reduce((sum, f) => sum + f.rating, 0),
      ratingCount: ratings.length,
      ...(spec.cancelReason ? { cancelReason: spec.cancelReason } : {}),
      version: WORKSHOP_SEED_VERSION,
      createdAt: stamp,
      updatedAt: stamp,
    };
    return seedDoc(`${COLLECTIONS.workshops}/${spec.id}`, workshop);
  });
}
