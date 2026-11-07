// UC #2-1 origin for distance sorting: the device location, or a geocoded postal code (ADR-018).
import { createMapProvider } from '@silveracademy/shared';
import { getDeviceLocation, type LocationResult } from '../../../services/deviceLocation';

export { getDeviceLocation, type LocationResult };

const map = createMapProvider({ env: { MAP_PROVIDER: process.env.EXPO_PUBLIC_MAP_PROVIDER } });

/** Never rejects: an unknown postal code or a map outage is `unavailable`. */
export const geocodePostal = (postal: string): Promise<LocationResult> =>
  map.geocodePostal(postal).then(
    (hit) => (hit ? { status: 'ok', origin: hit } : { status: 'unavailable' }),
    () => ({ status: 'unavailable' }),
  );
