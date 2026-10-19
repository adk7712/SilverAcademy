// UC #4-1 ManageAvailability ("Add Facility"): pure rules for venues-upsertFacility. No Firebase imports.
import { AppError, isWithinSgBounds, type Facility } from '@silveracademy/shared';

/**
 * Order: update of a missing facility -> NOT_FOUND; owned by someone else -> NOT_FACILITY_OWNER;
 * lat/lng outside Singapore -> LOCATION_OUT_OF_BOUNDS. Returns 'create' or 'update'.
 */
export function decideUpsertFacility(
  existing: Pick<Facility, 'partnerId'> | undefined,
  hasFacilityId: boolean,
  location: { lat: number; lng: number },
  uid: string,
): 'create' | 'update' {
  if (hasFacilityId) {
    if (!existing) throw new AppError('NOT_FOUND');
    if (existing.partnerId !== uid) throw new AppError('NOT_FACILITY_OWNER');
  }
  if (!isWithinSgBounds(location)) throw new AppError('LOCATION_OUT_OF_BOUNDS');
  return hasFacilityId ? 'update' : 'create';
}
