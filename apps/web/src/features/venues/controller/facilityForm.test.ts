// UC #4-1 facility form validation tests.
import { describe, expect, it } from 'vitest';
import {
  draftFromFacility,
  emptyFacilityDraft,
  parseAmenities,
  validateFacilityDraft,
} from './facilityForm';
import type { FacilityDraft } from '../types';

const valid: FacilityDraft = {
  name: 'Toa Payoh CC',
  address: '93 Toa Payoh Central',
  postalCode: '319194',
  lat: '1.3326',
  lng: '103.8472',
  capacity: '40',
  amenities: 'Projector, Wheelchair access, Projector',
};

describe('facility form', () => {
  it('builds callable input from a valid draft', () => {
    const r = validateFacilityDraft(valid);
    expect(r.errors).toEqual({});
    expect(r.input).toEqual({
      name: 'Toa Payoh CC',
      address: '93 Toa Payoh Central',
      postalCode: '319194',
      lat: 1.3326,
      lng: 103.8472,
      capacity: 40,
      amenities: ['Projector', 'Wheelchair access'],
    });
  });

  it('includes facilityId when editing', () => {
    expect(validateFacilityDraft({ ...valid, id: 'f1' }).input?.facilityId).toBe('f1');
  });

  it('flags empty form fields', () => {
    const r = validateFacilityDraft(emptyFacilityDraft());
    expect(r.input).toBeUndefined();
    expect(Object.keys(r.errors).sort()).toEqual([
      'address',
      'capacity',
      'lat',
      'lng',
      'name',
      'postalCode',
    ]);
  });

  it('rejects coordinates outside Singapore and bad numbers', () => {
    expect(validateFacilityDraft({ ...valid, lat: '51.5', lng: '-0.12' }).errors.lat).toBeDefined();
    expect(validateFacilityDraft({ ...valid, lat: 'abc' }).errors.lat).toBeDefined();
  });

  it('rejects bad postal code and capacity', () => {
    expect(validateFacilityDraft({ ...valid, postalCode: '123' }).errors.postalCode).toBeDefined();
    expect(validateFacilityDraft({ ...valid, capacity: '0' }).errors.capacity).toBeDefined();
    expect(validateFacilityDraft({ ...valid, capacity: '2.5' }).errors.capacity).toBeDefined();
    expect(validateFacilityDraft({ ...valid, capacity: '5000' }).errors.capacity).toBeDefined();
  });

  it('parses amenities and round-trips a facility view', () => {
    expect(parseAmenities(' a, ,b ,a')).toEqual(['a', 'b']);
    const d = draftFromFacility({
      id: 'f',
      name: 'N',
      address: 'A',
      postalCode: '123456',
      lat: 1.3,
      lng: 103.8,
      capacity: 5,
      amenities: ['x', 'y'],
    });
    expect(d.amenities).toBe('x, y');
    expect(d.id).toBe('f');
  });
});
