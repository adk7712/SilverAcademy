// UC #1-3 #4-1 #4-2 facilities, slots, venueRequests entities.
import type { SlotStatus, VenueRequestStatus, WorkshopCategory } from '../enums';
import type { TimestampLike, Timestamps } from './common';

export interface Facility extends Timestamps {
  id: string;
  partnerId: string;
  orgName: string;
  name: string;
  address: string;
  postalCode: string;
  lat: number;
  lng: number;
  capacity: number;
  amenities: string[];
}

/** facilities/{facilityId}/slots/{slotId} */
export interface TimeSlot extends Timestamps {
  id: string;
  facilityId: string;
  partnerId: string;
  startAt: TimestampLike;
  endAt: TimestampLike;
  status: SlotStatus;
  bookedWorkshopId: string | null;
  bookedRequestId: string | null;
}

export interface VenueRequestWorkshopSummary {
  title: string;
  description: string;
  category: WorkshopCategory;
  capacity: number;
  materials: string;
}

export interface VenueRequest extends Timestamps {
  id: string;
  workshopId: string;
  instructorId: string;
  instructorName: string;
  facilityId: string;
  facilityName: string;
  partnerId: string;
  slotId: string;
  slotStartAt: TimestampLike;
  slotEndAt: TimestampLike;
  workshopSummary: VenueRequestWorkshopSummary;
  status: VenueRequestStatus;
  decisionReason?: string;
  infoRequest?: string;
  infoResponse?: string;
  suggestedSlotId?: string;
  decidedAt?: TimestampLike;
  decidedBy?: string;
}
