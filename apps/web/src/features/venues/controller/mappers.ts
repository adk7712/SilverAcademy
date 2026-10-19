// UC #4-1 #4-2 entity -> view model mappers (Timestamps become epoch ms).
import type { Facility, TimeSlot, VenueRequest } from '@silveracademy/shared';
import type { FacilityView, RequestView, SlotView } from '../types';

export const toFacilityView = (f: Facility): FacilityView => ({
  id: f.id,
  name: f.name,
  address: f.address,
  postalCode: f.postalCode,
  lat: f.lat,
  lng: f.lng,
  capacity: f.capacity,
  amenities: f.amenities ?? [],
});

export const toSlotView = (s: TimeSlot): SlotView => ({
  id: s.id,
  facilityId: s.facilityId,
  startMs: s.startAt.toDate().getTime(),
  endMs: s.endAt.toDate().getTime(),
  status: s.status,
  locked: s.status === 'BOOKED',
});

export const toRequestView = (r: VenueRequest): RequestView => ({
  id: r.id,
  workshopId: r.workshopId,
  workshopTitle: r.workshopSummary.title,
  description: r.workshopSummary.description,
  category: r.workshopSummary.category,
  workshopCapacity: r.workshopSummary.capacity,
  materials: r.workshopSummary.materials,
  instructorName: r.instructorName,
  facilityId: r.facilityId,
  facilityName: r.facilityName,
  slotId: r.slotId,
  startMs: r.slotStartAt.toDate().getTime(),
  endMs: r.slotEndAt.toDate().getTime(),
  status: r.status,
  createdMs: r.createdAt.toDate().getTime(),
  decisionReason: r.decisionReason,
  infoRequest: r.infoRequest,
  infoResponse: r.infoResponse,
});
