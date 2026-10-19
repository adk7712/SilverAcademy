// UC #4-1 address lookup via MapProvider stub tests.
import { describe, expect, it } from 'vitest';
import { StubMapProvider } from '@silveracademy/shared';
import { lookupPostalCode } from './addressLookup';
import { venueStrings } from '../strings';

describe('lookupPostalCode', () => {
  it('finds a fixture postal code', async () => {
    const out = await lookupPostalCode(new StubMapProvider(), '319194');
    expect(out.kind).toBe('found');
    if (out.kind === 'found') {
      expect(out.lat).toBeCloseTo(1.3326);
      expect(out.address).toContain('Toa Payoh');
    }
  });

  it('reports not found', async () => {
    expect((await lookupPostalCode(new StubMapProvider(), '999999')).kind).toBe('notFound');
  });

  it('falls back to manual entry when the map is down', async () => {
    const out = await lookupPostalCode(new StubMapProvider({ unavailable: true }), '319194');
    expect(out).toEqual({ kind: 'unavailable', message: venueStrings.facility.mapDown });
  });
});
