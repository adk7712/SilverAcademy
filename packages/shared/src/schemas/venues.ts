// UC #1-3 #4-1 #4-2 schemas for venues-* callables.
import { z } from 'zod';
import { SLOT_EDITABLE_STATUSES, VENUE_DECISIONS, VENUE_REQUEST_STATUSES } from '../enums';
import {
  AMENITIES_MAX,
  AMENITY_MAX_LENGTH,
  FACILITY_ADDRESS_MAX,
  FACILITY_CAPACITY_MAX,
  FACILITY_NAME_MAX,
} from '../constants';
import { idSchema, isoDateTimeSchema, postalCodeSchema, reasonSchema } from './common';

const idList = z.array(idSchema);

export const upsertFacilityInput = z.object({
  facilityId: idSchema.optional(),
  name: z.string().trim().min(1).max(FACILITY_NAME_MAX),
  address: z.string().trim().min(1).max(FACILITY_ADDRESS_MAX),
  postalCode: postalCodeSchema,
  lat: z.number().finite(),
  lng: z.number().finite(),
  capacity: z.number().int().min(1).max(FACILITY_CAPACITY_MAX),
  amenities: z.array(z.string().trim().min(1).max(AMENITY_MAX_LENGTH)).max(AMENITIES_MAX),
});
export const upsertFacilityOutput = z.object({ facilityId: idSchema });

export const upsertSlotInput = z.object({
  facilityId: idSchema,
  slotId: idSchema.optional(),
  startAt: isoDateTimeSchema,
  endAt: isoDateTimeSchema,
  status: z.enum(SLOT_EDITABLE_STATUSES),
});
export const upsertSlotOutput = z.object({ slotId: idSchema, conflictedRequestIds: idList });

export const deleteSlotInput = z.object({ facilityId: idSchema, slotId: idSchema });
export const deleteSlotOutput = z.object({ conflictedRequestIds: idList });

export const requestVenueInput = z.object({
  workshopId: idSchema,
  facilityId: idSchema,
  slotId: idSchema,
});
export const requestVenueOutput = z.object({ requestId: idSchema, status: z.literal('PENDING') });

/** REQUEST_INFO without `message` is REASON_REQUIRED, checked by the handler. */
export const decideVenueRequestInput = z.object({
  requestId: idSchema,
  decision: z.enum(VENUE_DECISIONS),
  reason: reasonSchema.optional(),
  message: reasonSchema.optional(),
  suggestedSlotId: idSchema.optional(),
});
export const decideVenueRequestOutput = z.object({
  status: z.enum(VENUE_REQUEST_STATUSES),
  workshopId: idSchema,
  conflictedRequestIds: idList,
});

export const respondToInfoRequestInput = z.object({ requestId: idSchema, message: reasonSchema });
export const respondToInfoRequestOutput = z.object({ status: z.literal('PENDING') });
export const withdrawVenueRequestInput = z.object({ requestId: idSchema });
export const withdrawVenueRequestOutput = z.object({ status: z.literal('WITHDRAWN') });
