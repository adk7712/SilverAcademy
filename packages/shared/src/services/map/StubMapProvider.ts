// UC #1-3 offline StubMapProvider: deterministic fixtures, no tiles (list view); NFR 7.4 fallback testing.
import { MAP_SEARCH_DEFAULT_LIMIT } from '../../constants';
import { MAP_FIXTURES } from './fixtures';
import type { GeocodeResult, MapProvider } from './MapProvider';
import { mapUnavailable } from './mapErrors';

export interface StubMapConfig {
  fixtures?: readonly GeocodeResult[];
  /** Simulate an outage: every call except isAvailable() rejects MAP_UNAVAILABLE. */
  unavailable?: boolean;
}

export class StubMapProvider implements MapProvider {
  readonly kind = 'stub' as const;
  private readonly fixtures: readonly GeocodeResult[];
  private readonly down: boolean;

  constructor(cfg: StubMapConfig = {}) {
    this.fixtures = cfg.fixtures ?? MAP_FIXTURES;
    this.down = cfg.unavailable ?? false;
  }

  async isAvailable(): Promise<boolean> {
    return !this.down;
  }

  async search(query: string, limit = MAP_SEARCH_DEFAULT_LIMIT): Promise<GeocodeResult[]> {
    if (this.down) throw mapUnavailable('stub outage');
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return this.fixtures
      .filter((f) =>
        `${f.buildingName ?? ''} ${f.address} ${f.postalCode}`.toLowerCase().includes(q),
      )
      .slice(0, limit)
      .map((f) => ({ ...f }));
  }

  async geocodePostal(postalCode: string): Promise<GeocodeResult | null> {
    if (this.down) throw mapUnavailable('stub outage');
    const hit = this.fixtures.find((f) => f.postalCode === postalCode.trim());
    return hit ? { ...hit } : null;
  }

  tileUrlTemplate(): null {
    return null;
  }

  attribution(): string {
    return 'Stub map data (offline demo)';
  }
}
