// UC #4-1, #4-2 shared conflict planning (architecture 4.6): requests that lose their slot become CONFLICTED. No Firebase imports.
import type { VenueRequest, Workshop } from '@silveracademy/shared';
import { paths } from '../../common';

export const OPEN_REQUEST_STATUSES = ['PENDING', 'AWAITING_INFO'] as const;
export const isOpenRequest = (r: Pick<VenueRequest, 'status'>): boolean =>
  (OPEN_REQUEST_STATUSES as readonly string[]).includes(r.status);

export interface RequestWithWorkshop {
  request: Pick<VenueRequest, 'id' | 'status' | 'instructorId' | 'workshopId' | 'facilityName'>;
  workshop: Pick<Workshop, 'status' | 'activeVenueRequestId'> | undefined;
}

export interface ConflictPlan {
  requestId: string;
  workshopId: string;
  instructorId: string;
  /** True when the workshop is still waiting on this request and must return to DRAFT. */
  resetWorkshop: boolean;
  notice: { userId: string; title: string; body: string; refPath: string };
}

/** Only PENDING / AWAITING_INFO requests are affected; anything else is skipped. */
export function planConflicts(items: RequestWithWorkshop[], why: string): ConflictPlan[] {
  return items
    .filter(({ request }) => isOpenRequest(request))
    .map(({ request, workshop }) => ({
      requestId: request.id,
      workshopId: request.workshopId,
      instructorId: request.instructorId,
      resetWorkshop:
        !!workshop &&
        workshop.activeVenueRequestId === request.id &&
        workshop.status === 'PENDING_VENUE',
      notice: {
        userId: request.instructorId,
        title: 'Venue slot no longer available',
        body: `Your request for ${request.facilityName} could not be kept: ${why}. Please pick another slot.`,
        refPath: paths.venueRequest(request.id),
      },
    }));
}
