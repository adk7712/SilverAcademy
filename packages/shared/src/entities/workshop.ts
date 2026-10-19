// UC #1-2 #2-1 #2-4 #3-1 #3-2 #5-2 workshops, volunteerAssignments, feedback entities.
import type { VolunteerAssignmentStatus, WorkshopCategory, WorkshopStatus } from '../enums';
import type { FeedbackRating } from '../constants';
import type { TimestampLike, Timestamps, Versioned } from './common';

export interface VenueSnapshot {
  facilityId: string;
  name: string;
  address: string;
  postalCode: string;
  lat: number;
  lng: number;
  partnerId: string;
}

export interface Workshop extends Timestamps, Versioned {
  id: string;
  instructorId: string;
  instructorName: string;
  title: string;
  description: string;
  category: WorkshopCategory;
  capacity: number;
  materials: string;
  status: WorkshopStatus;
  statusBeforeArchive?: WorkshopStatus;
  seatsTaken: number;
  attendedCount: number;
  needsVolunteers: boolean;
  volunteerSlots: number;
  volunteersAssigned: number;
  activeVenueRequestId: string | null;
  slotId: string | null;
  startAt: TimestampLike | null;
  endAt: TimestampLike | null;
  venue: VenueSnapshot | null;
  ratingSum: number;
  ratingCount: number;
  cancelReason?: string;
}

export interface VolunteerAssignment extends Timestamps {
  id: string;
  workshopId: string;
  volunteerId: string;
  volunteerName: string;
  workshopTitle: string;
  startAt: TimestampLike;
  status: VolunteerAssignmentStatus;
}

export interface Feedback {
  bookingId: string;
  workshopId: string;
  learnerId: string;
  instructorId: string;
  rating: FeedbackRating;
  comment: string;
  tags: string[];
  createdAt: TimestampLike;
}
