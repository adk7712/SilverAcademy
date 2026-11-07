// UC #2-1 origin for distance sorting: the device location, or a geocoded postal code (ADR-018).
import { createMapProvider } from '@silveracademy/shared';
import { getDeviceLocation, type LocationResult } from '../../../services/deviceLocation';

export { getDeviceLocation, type LocationResult };

const map = createMapProvider({ env: { MAP_PROVIDER: process.env.EXPO_PUBLIC_MAP_PROVIDER } });

/** Never throws: an unknown postal code or a map outage is `unavailable`. */
export async function geocodePostal(postal: string): Promise<LocationResult> {
  try {
    const hit = await map.geocodePostal(postal);
    return hit
      ? { status: 'ok', origin: { lat: hit.lat, lng: hit.lng } }
      : { status: 'unavailable' };
  } catch {
    return { status: 'unavailable' };
  }
}
