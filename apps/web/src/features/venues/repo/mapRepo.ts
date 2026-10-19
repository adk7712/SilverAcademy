// UC #4-1 shared MapProvider for coordinates lookup (stub unless VITE_MAP_PROVIDER=onemap). No Firebase here.
import { createMapProvider } from '@silveracademy/shared';
import type { MapProvider } from '@silveracademy/shared';

let provider: MapProvider | undefined;

export function getMapProvider(): MapProvider {
  provider ??= createMapProvider({
    env: {
      MAP_PROVIDER: import.meta.env.VITE_MAP_PROVIDER as string | undefined,
      ONEMAP_TOKEN: import.meta.env.VITE_ONEMAP_TOKEN as string | undefined,
    },
  });
  return provider;
}
