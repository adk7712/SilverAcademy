// UC #1-3 OneMap REST MapProvider (search, postal geocode); NFR 7.4 timeouts -> MAP_UNAVAILABLE.
import { MAP_SEARCH_DEFAULT_LIMIT, MAP_TIMEOUT_MS, POSTAL_CODE_LENGTH } from '../../constants';
import type { GeocodeResult, MapProvider } from './MapProvider';
import { mapUnavailable } from './mapErrors';

export const ONEMAP_BASE_URL = 'https://www.onemap.gov.sg';
export const ONEMAP_TILE_URL = `${ONEMAP_BASE_URL}/maps/tiles/Default/{z}/{x}/{y}.png`;
export const ONEMAP_ATTRIBUTION = 'OneMap, Singapore Land Authority';
const HTTP_OK_MIN = 200;
const HTTP_OK_MAX = 299;

export interface OneMapConfig {
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
  /** Optional OneMap access token (from env ONEMAP_TOKEN); sent as Authorization header. */
  token?: string;
  baseUrl?: string;
}

interface OneMapRow {
  SEARCHVAL?: string;
  BUILDING?: string;
  ADDRESS?: string;
  POSTAL?: string;
  LATITUDE?: string;
  LONGITUDE?: string;
}

function toResult(r: OneMapRow): GeocodeResult | null {
  const lat = Number(r.LATITUDE);
  const lng = Number(r.LONGITUDE);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  const building = r.BUILDING && r.BUILDING !== 'NIL' ? r.BUILDING : undefined;
  const out: GeocodeResult = {
    lat,
    lng,
    address: r.ADDRESS ?? r.SEARCHVAL ?? '',
    postalCode: r.POSTAL && r.POSTAL !== 'NIL' ? r.POSTAL : '',
  };
  if (building) out.buildingName = building;
  return out;
}

export class OneMapProvider implements MapProvider {
  readonly kind = 'onemap' as const;
  private readonly fetchImpl: typeof fetch;
  private readonly timeoutMs: number;
  private readonly token?: string;
  private readonly baseUrl: string;

  constructor(cfg: OneMapConfig = {}) {
    this.fetchImpl = cfg.fetchImpl ?? fetch;
    this.timeoutMs = cfg.timeoutMs ?? MAP_TIMEOUT_MS;
    this.token = cfg.token || undefined;
    this.baseUrl = cfg.baseUrl ?? ONEMAP_BASE_URL;
  }

  private async getJson(query: string): Promise<{ results?: OneMapRow[] }> {
    const url = `${this.baseUrl}/api/common/elastic/search?searchVal=${encodeURIComponent(query)}&returnGeom=Y&getAddrDetails=Y&pageNum=1`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const res = await this.fetchImpl(url, {
        signal: controller.signal,
        headers: this.token ? { Authorization: this.token } : undefined,
      });
      if (res.status < HTTP_OK_MIN || res.status > HTTP_OK_MAX) {
        throw mapUnavailable(`HTTP ${res.status}`);
      }
      return (await res.json()) as { results?: OneMapRow[] };
    } catch (e) {
      if (e instanceof Error && e.name === 'AppError') throw e;
      const timedOut = controller.signal.aborted;
      throw mapUnavailable(timedOut ? 'timeout' : 'network error');
    } finally {
      clearTimeout(timer);
    }
  }

  async isAvailable(): Promise<boolean> {
    try {
      await this.getJson('Singapore');
      return true;
    } catch {
      return false;
    }
  }

  async search(query: string, limit = MAP_SEARCH_DEFAULT_LIMIT): Promise<GeocodeResult[]> {
    const q = query.trim();
    if (!q) return [];
    const body = await this.getJson(q);
    const rows = Array.isArray(body.results) ? body.results : [];
    return rows
      .map(toResult)
      .filter((r): r is GeocodeResult => r !== null)
      .slice(0, limit);
  }

  async geocodePostal(postalCode: string): Promise<GeocodeResult | null> {
    const code = postalCode.trim();
    if (code.length !== POSTAL_CODE_LENGTH || !/^\d+$/.test(code)) return null;
    const hits = await this.search(code, MAP_SEARCH_DEFAULT_LIMIT);
    return hits.find((h) => h.postalCode === code) ?? null;
  }

  tileUrlTemplate(): string {
    return ONEMAP_TILE_URL;
  }

  attribution(): string {
    return ONEMAP_ATTRIBUTION;
  }
}
