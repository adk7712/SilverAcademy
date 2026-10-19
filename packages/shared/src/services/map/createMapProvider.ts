// UC #1-3 factory: choose OneMap or stub by config/env MAP_PROVIDER (default stub); NFR 7.4.
import { OneMapProvider } from './OneMapProvider';
import { StubMapProvider } from './StubMapProvider';
import type { MapProvider, MapProviderKind } from './MapProvider';

export interface MapProviderConfig {
  kind?: MapProviderKind;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
  token?: string;
  /** Env-like bag (MAP_PROVIDER, ONEMAP_TOKEN) used when `kind`/`token` are not given. */
  env?: Record<string, string | undefined>;
}

export function createMapProvider(cfg: MapProviderConfig = {}): MapProvider {
  const kind = cfg.kind ?? (cfg.env?.MAP_PROVIDER === 'onemap' ? 'onemap' : 'stub');
  if (kind === 'onemap') {
    return new OneMapProvider({
      fetchImpl: cfg.fetchImpl,
      timeoutMs: cfg.timeoutMs,
      token: cfg.token ?? cfg.env?.ONEMAP_TOKEN,
    });
  }
  return new StubMapProvider();
}
