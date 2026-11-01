// Lab 4 basis path tests: OneMapProvider.getJson, V(G) = 7 decisions + 1 = 8.
import { mapUnavailable } from './mapErrors';
import { OneMapProvider } from './OneMapProvider';

type Fetch = (url: string, init: RequestInit) => Promise<unknown>;
const ok =
  (status: number): Fetch =>
  async () => ({ status, json: async () => ({ results: [] }) });
const reject =
  (e: unknown): Fetch =>
  async () =>
    Promise.reject(e);
const hang: Fetch = (_url, init) =>
  new Promise((_, rej) => init.signal?.addEventListener('abort', () => rej(new Error('aborted'))));

const call = (fetchImpl: Fetch, token?: string) =>
  new OneMapProvider({ fetchImpl: fetchImpl as unknown as typeof fetch, token, timeoutMs: 5 })[
    'getJson'
  ]('toa payoh');

it.each<[string, string | undefined, Record<string, string> | undefined]>([
  ['G1 no token, HTTP 200', undefined, undefined],
  ['G2 token, HTTP 299', 'tok', { Authorization: 'tok' }],
])('%s', async (_path, token, headers) => {
  const f = jest.fn(ok(token ? 299 : 200));
  await expect(call(f, token)).resolves.toEqual({ results: [] });
  expect(f.mock.calls[0]?.[1].headers).toEqual(headers);
});

it.each<[string, Fetch, string]>([
  ['G3 HTTP 199', ok(199), 'HTTP 199'],
  ['G4 HTTP 300', ok(300), 'HTTP 300'],
  ['G5 fetch throws Error', reject(new TypeError('fetch failed')), 'network error'],
  ['G6 fetch throws non-Error', reject('offline'), 'network error'],
  ['G7 timeout', hang, 'timeout'],
  ['G8 fetch throws AppError', reject(mapUnavailable('upstream')), 'upstream'],
])('%s', async (_path, fetchImpl, reason) => {
  await expect(call(fetchImpl)).rejects.toMatchObject({
    code: 'MAP_UNAVAILABLE',
    message: `Map service unavailable: ${reason}`,
  });
});
