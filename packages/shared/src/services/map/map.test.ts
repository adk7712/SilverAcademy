// UC #1-3 tests for map providers, factory and MAP_UNAVAILABLE fallback (NFR 7.4). No network.
import { haversineKm } from '../../logic/geo';
import { createMapProvider } from './createMapProvider';
import { MAP_FIXTURES } from './fixtures';
import { isMapUnavailable } from './mapErrors';
import { OneMapProvider } from './OneMapProvider';
import { StubMapProvider } from './StubMapProvider';

const row = {
  BUILDING: 'TOA PAYOH CC',
  ADDRESS: '93 TOA PAYOH CENTRAL',
  POSTAL: '319194',
  LATITUDE: '1.33',
  LONGITUDE: '103.84',
};
const okFetch = (body: unknown, status = 200) =>
  jest.fn(async () => ({ status, json: async () => body }) as unknown as Response);

describe('OneMapProvider', () => {
  it('maps search results and builds URL with token header', async () => {
    const f = okFetch({ results: [row, { ...row, LATITUDE: 'x' }] });
    const p = new OneMapProvider({ fetchImpl: f as unknown as typeof fetch, token: 'tok' });
    const out = await p.search('toa payoh');
    expect(out).toEqual([
      {
        lat: 1.33,
        lng: 103.84,
        address: row.ADDRESS,
        postalCode: '319194',
        buildingName: row.BUILDING,
      },
    ]);
    const [url, init] = f.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toContain('searchVal=toa%20payoh');
    expect((init.headers as Record<string, string>).Authorization).toBe('tok');
  });

  it("treats 'NIL' building and postal as absent", async () => {
    const f = okFetch({ results: [{ ...row, BUILDING: 'NIL', POSTAL: 'NIL' }] });
    const p = new OneMapProvider({ fetchImpl: f as unknown as typeof fetch });
    const [r] = await p.search('x');
    expect(r?.postalCode).toBe('');
    expect(r).not.toHaveProperty('buildingName');
  });

  it('geocodePostal returns match or null; bad format skips network', async () => {
    const f = okFetch({ results: [row] });
    const p = new OneMapProvider({ fetchImpl: f as unknown as typeof fetch });
    expect((await p.geocodePostal('319194'))?.postalCode).toBe('319194');
    expect(await p.geocodePostal('000000')).toBeNull();
    expect(await p.geocodePostal('12')).toBeNull();
    expect(f).toHaveBeenCalledTimes(2);
  });

  it('maps HTTP and network failures to MAP_UNAVAILABLE', async () => {
    const p500 = new OneMapProvider({ fetchImpl: okFetch({}, 500) as unknown as typeof fetch });
    await expect(p500.search('x')).rejects.toMatchObject({ code: 'MAP_UNAVAILABLE' });
    const boom = jest.fn(async () => {
      throw new Error('offline');
    });
    const pn = new OneMapProvider({ fetchImpl: boom as unknown as typeof fetch });
    const err = await pn.search('x').catch((e: unknown) => e);
    expect(isMapUnavailable(err)).toBe(true);
    expect(await pn.isAvailable()).toBe(false);
  });

  it('times out via AbortController', async () => {
    const hang = jest.fn(
      (_u: string, init: RequestInit) =>
        new Promise((_r, rej) => {
          init.signal?.addEventListener('abort', () => rej(new Error('aborted')));
        }),
    );
    const p = new OneMapProvider({ fetchImpl: hang as unknown as typeof fetch, timeoutMs: 10 });
    await expect(p.search('x')).rejects.toMatchObject({ code: 'MAP_UNAVAILABLE' });
  });

  it('exposes tiles and attribution', () => {
    const p = new OneMapProvider({ fetchImpl: okFetch({}) as unknown as typeof fetch });
    expect(p.tileUrlTemplate()).toContain('{z}/{x}/{y}');
    expect(p.attribution()).toContain('OneMap');
  });
});

describe('StubMapProvider', () => {
  it('has ~10 fixtures and deterministic search', async () => {
    expect(MAP_FIXTURES.length).toBe(10);
    const p = new StubMapProvider();
    const a = await p.search('cc');
    expect(a).toEqual(await p.search('CC'));
    expect(a.length).toBeGreaterThan(0);
    expect(await p.search('zzz')).toEqual([]);
    expect(await p.search('cc', 2)).toHaveLength(2);
  });

  it('geocodes postal codes and has no tiles', async () => {
    const p = new StubMapProvider();
    const hit = await p.geocodePostal('319194');
    expect(hit?.buildingName).toBe('Toa Payoh CC');
    expect(await p.geocodePostal('999999')).toBeNull();
    expect(p.tileUrlTemplate()).toBeNull();
    expect(haversineKm(hit!, MAP_FIXTURES[1]!)).toBeGreaterThan(0);
  });

  it('simulated outage throws MAP_UNAVAILABLE', async () => {
    const p = new StubMapProvider({ unavailable: true });
    expect(await p.isAvailable()).toBe(false);
    await expect(p.search('a')).rejects.toMatchObject({ code: 'MAP_UNAVAILABLE' });
    expect(isMapUnavailable(await p.geocodePostal('319194').catch((e: unknown) => e))).toBe(true);
  });
});

describe('createMapProvider', () => {
  it('defaults to stub, honours kind and env', () => {
    expect(createMapProvider().kind).toBe('stub');
    expect(createMapProvider({ kind: 'onemap' }).kind).toBe('onemap');
    expect(createMapProvider({ env: { MAP_PROVIDER: 'onemap' } }).kind).toBe('onemap');
    expect(createMapProvider({ env: { MAP_PROVIDER: 'bogus' } }).kind).toBe('stub');
    expect(createMapProvider({ kind: 'stub', env: { MAP_PROVIDER: 'onemap' } }).kind).toBe('stub');
  });
});
