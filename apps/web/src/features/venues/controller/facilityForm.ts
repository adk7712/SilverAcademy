// UC #4-1 Add/Edit Facility draft handling and validation (pure; zod schema is the source of truth).
import {
  FACILITY_CAPACITY_MAX,
  POSTAL_CODE_LENGTH,
  isWithinSgBounds,
  venuesSchemas,
} from '@silveracademy/shared';
import type { CallableInput } from '@silveracademy/shared';
import { venueStrings } from '../strings';
import type { FacilityDraft, FacilityView } from '../types';

export type FacilityInput = CallableInput<'venues-upsertFacility'>;
export type FacilityErrors = Partial<Record<keyof FacilityDraft, string>>;

export const emptyFacilityDraft = (): FacilityDraft => ({
  name: '',
  address: '',
  postalCode: '',
  lat: '',
  lng: '',
  capacity: '',
  amenities: '',
});

export const draftFromFacility = (f: FacilityView): FacilityDraft => ({
  id: f.id,
  name: f.name,
  address: f.address,
  postalCode: f.postalCode,
  lat: String(f.lat),
  lng: String(f.lng),
  capacity: String(f.capacity),
  amenities: f.amenities.join(', '),
});

export const parseAmenities = (text: string): string[] => [
  ...new Set(
    text
      .split(',')
      .map((a) => a.trim())
      .filter(Boolean),
  ),
];

const toNumber = (v: string): number => (v.trim() === '' ? Number.NaN : Number(v));

export interface FacilityValidation {
  errors: FacilityErrors;
  input?: FacilityInput;
}

export function validateFacilityDraft(draft: FacilityDraft): FacilityValidation {
  const f = venueStrings.facility;
  const lat = toNumber(draft.lat);
  const lng = toNumber(draft.lng);
  const capacity = toNumber(draft.capacity);
  const errors: FacilityErrors = {};

  if (!Number.isFinite(lat)) errors.lat = f.coordsInvalid;
  if (!Number.isFinite(lng)) errors.lng = f.coordsInvalid;
  if (!errors.lat && !errors.lng && !isWithinSgBounds({ lat, lng })) {
    errors.lat = f.coordsOutOfBounds;
    errors.lng = f.coordsOutOfBounds;
  }
  if (!Number.isInteger(capacity) || capacity < 1 || capacity > FACILITY_CAPACITY_MAX) {
    errors.capacity = f.capacityInvalid;
  }

  const candidate = {
    ...(draft.id ? { facilityId: draft.id } : {}),
    name: draft.name,
    address: draft.address,
    postalCode: draft.postalCode.trim(),
    lat,
    lng,
    capacity,
    amenities: parseAmenities(draft.amenities),
  };
  const parsed = venuesSchemas.upsertFacilityInput.safeParse(candidate);
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      const field = key === 'facilityId' ? undefined : (key as keyof FacilityDraft | undefined);
      if (field && !errors[field]) {
        errors[field] = field === 'postalCode' ? f.postalInvalid : f.fieldInvalid;
      }
    }
  }
  if (Object.keys(errors).length > 0 || !parsed.success) return { errors };
  return { errors, input: parsed.data };
}

export const isPostalCodeComplete = (v: string): boolean =>
  v.trim().length === POSTAL_CODE_LENGTH && /^\d+$/.test(v.trim());
