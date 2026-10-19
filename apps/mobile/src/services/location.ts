// UC #3-1 device location behind a tiny interface (permission denied/unavailable -> caller falls back to an unordered list).
import * as Location from 'expo-location';
import type { LatLng } from '@silveracademy/shared';

export type LocationResult = { status: 'granted'; coords: LatLng } | { status: 'denied' };

/** Never throws: any failure (denied, services off, timeout) is reported as `denied`. */
export async function requestCurrentLocation(): Promise<LocationResult> {
  try {
    const permission = await Location.requestForegroundPermissionsAsync();
    if (!permission.granted) return { status: 'denied' };
    const position = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    return {
      status: 'granted',
      coords: { lat: position.coords.latitude, lng: position.coords.longitude },
    };
  } catch {
    return { status: 'denied' };
  }
}
