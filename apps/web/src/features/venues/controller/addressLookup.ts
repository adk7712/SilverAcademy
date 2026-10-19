// UC #4-1 postal code -> address and coordinates via MapProvider; failures degrade to manual entry.
import type { MapProvider } from '@silveracademy/shared';
import { getMapProvider } from '../repo/mapRepo';
import { venueStrings } from '../strings';

export type LookupOutcome =
  | { kind: 'found'; address: string; postalCode: string; lat: number; lng: number }
  | { kind: 'notFound'; message: string }
  | { kind: 'unavailable'; message: string };

export async function lookupPostalCode(
  provider: MapProvider,
  postalCode: string,
): Promise<LookupOutcome> {
  const f = venueStrings.facility;
  try {
    const hit = await provider.geocodePostal(postalCode.trim());
    if (!hit) return { kind: 'notFound', message: f.locationNotFound };
    return {
      kind: 'found',
      address: hit.buildingName ? `${hit.buildingName}, ${hit.address}` : hit.address,
      postalCode: hit.postalCode || postalCode.trim(),
      lat: hit.lat,
      lng: hit.lng,
    };
  } catch {
    return { kind: 'unavailable', message: f.mapDown };
  }
}

/** Looks up a postal code with the app's configured MapProvider. */
export const findLocation = (postalCode: string): Promise<LookupOutcome> =>
  lookupPostalCode(getMapProvider(), postalCode);
