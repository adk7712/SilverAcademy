// UC #1-3 / NFR 7.4 asks MapProvider whether the map can be shown; false means list view only.
import { useEffect, useMemo, useState } from 'react';
import { createMapProvider } from '@silveracademy/shared';

export function useMapAvailability() {
  const provider = useMemo(
    () => createMapProvider({ env: { MAP_PROVIDER: process.env.EXPO_PUBLIC_MAP_PROVIDER } }),
    [],
  );
  const [available, setAvailable] = useState(false);
  useEffect(() => {
    let live = true;
    provider
      .isAvailable()
      .then((ok) => live && setAvailable(ok))
      .catch(() => live && setAvailable(false));
    return () => {
      live = false;
    };
  }, [provider]);
  return { available, attribution: provider.attribution() };
}
