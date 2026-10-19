// Shared small data-loading hook: loading/error/data with reload (admin users and workshops features).
import { useCallback, useEffect, useState } from 'react';

export interface Loaded<T> {
  data?: T;
  loading: boolean;
  error?: unknown;
  reload: () => void;
}

export function useLoad<T>(load: () => Promise<T>, deps: readonly unknown[]): Loaded<T> {
  const [state, setState] = useState<{ data?: T; loading: boolean; error?: unknown }>({
    loading: true,
  });
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let live = true;
    setState((s) => ({ ...s, loading: true, error: undefined }));
    load().then(
      (data) => live && setState({ data, loading: false }),
      (error: unknown) => live && setState({ loading: false, error }),
    );
    return () => {
      live = false;
    };
  }, [...deps, tick]);

  const reload = useCallback(() => setTick((t) => t + 1), []);
  return { ...state, reload };
}
