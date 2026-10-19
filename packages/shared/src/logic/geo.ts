// UC #1-3 #2-1 #3-1 geo helpers: distance and Singapore bounds validation.
import { EARTH_RADIUS_KM, SG_BOUNDS } from '../constants';

export interface LatLng {
  lat: number;
  lng: number;
}

const toRad = (deg: number) => (deg * Math.PI) / 180;

/** Great-circle distance in km. */
export function haversineKm(a: LatLng, b: LatLng): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Facility validation (LOCATION_OUT_OF_BOUNDS). */
export function isWithinSgBounds(p: LatLng): boolean {
  return (
    p.lat >= SG_BOUNDS.latMin &&
    p.lat <= SG_BOUNDS.latMax &&
    p.lng >= SG_BOUNDS.lngMin &&
    p.lng <= SG_BOUNDS.lngMax
  );
}
