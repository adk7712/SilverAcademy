// Local view models for venues; entity types come from @silveracademy/shared. UC #4-1 #4-2.
import type { SlotStatus, VenueRequestStatus, WorkshopCategory } from '@silveracademy/shared';

export interface FacilityView {
  id: string;
  name: string;
  address: string;
  postalCode: string;
  lat: number;
  lng: number;
  capacity: number;
  amenities: string[];
}

export interface SlotView {
  id: string;
  facilityId: string;
  startMs: number;
  endMs: number;
  status: SlotStatus;
  /** BOOKED slots are locked: no edit, no delete. */
  locked: boolean;
}

export interface RequestView {
  id: string;
  workshopId: string;
  workshopTitle: string;
  description: string;
  category: WorkshopCategory;
  workshopCapacity: number;
  materials: string;
  instructorName: string;
  facilityId: string;
  facilityName: string;
  slotId: string;
  startMs: number;
  endMs: number;
  status: VenueRequestStatus;
  createdMs: number;
  decisionReason?: string;
  infoRequest?: string;
  infoResponse?: string;
}

/** Text form state; numbers stay strings until validated. */
export interface FacilityDraft {
  id?: string;
  name: string;
  address: string;
  postalCode: string;
  lat: string;
  lng: string;
  capacity: string;
  amenities: string;
}

/** Slot form state using `datetime-local` strings. */
export interface SlotDraft {
  id?: string;
  start: string;
  end: string;
  status: 'AVAILABLE' | 'UNAVAILABLE' | 'MAINTENANCE';
}
