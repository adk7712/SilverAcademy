// UC #1-3 MapProvider interface (architecture.md 5.2); implementations live in this folder (task 1.6).
import type { LatLng } from '../../logic/geo';

export type { LatLng };

export interface GeocodeResult extends LatLng {
  address: string;
  postalCode: string;
  buildingName?: string;
}

export type MapProviderKind = 'onemap' | 'stub';

export interface MapProvider {
  readonly kind: MapProviderKind;
  /** Cheap health probe (timeout MAP_TIMEOUT_MS). False -> UI uses list view (#1-3 Ex2). */
  isAvailable(): Promise<boolean>;
  /** Rejects with AppError MAP_UNAVAILABLE on network failure or timeout. */
  search(query: string, limit?: number): Promise<GeocodeResult[]>;
  /** 6-digit SG postal code -> location; null if not found. */
  geocodePostal(postalCode: string): Promise<GeocodeResult | null>;
  /** XYZ raster tile template, or null (list view). */
  tileUrlTemplate(): string | null;
  attribution(): string;
}
