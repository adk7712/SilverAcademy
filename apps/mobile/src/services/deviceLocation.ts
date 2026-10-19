// UC #2-1 device location service (expo-location; browser geolocation on web). Never throws.
import * as Location from 'expo-location';
import type { LatLng } from '@silveracademy/shared';

export type LocationResult =
  { status: 'ok'; origin: LatLng } | { status: 'denied' } | { status: 'unavailable' };

export async function getDeviceLocation(): Promise<LocationResult> {
  try {
    const perm = await Location.requestForegroundPermissionsAsync();
    if (!perm.granted) return { status: 'denied' };
    const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    return { status: 'ok', origin: { lat: pos.coords.latitude, lng: pos.coords.longitude } };
  } catch {
    return { status: 'unavailable' };
  }
}
