// UC #3-1 #3-2 #3-3 view models for the Volunteer screens; entities come from @silveracademy/shared.
import type { VolunteerAssignmentStatus, WorkshopStatus } from '@silveracademy/shared';

export interface OpportunityWorkshop {
  id: string;
  title: string;
  description: string;
  instructorName: string;
  materials: string;
  status: WorkshopStatus;
  startAt: Date | null;
  endAt: Date | null;
  venue: { name: string; address: string; lat: number; lng: number } | null;
  needsVolunteers: boolean;
  volunteerSlots: number;
  volunteersAssigned: number;
  seatsTaken: number;
  attendedCount: number;
}

export interface AssignmentView {
  workshopId: string;
  status: VolunteerAssignmentStatus;
}

export type DetailAction = 'ASSIST' | 'WITHDRAW' | 'FULL' | 'NOT_ACCEPTING' | 'STARTED';
