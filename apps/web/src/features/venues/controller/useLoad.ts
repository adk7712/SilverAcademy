// Small load-and-reload hook shared by venue lists (React state only; data access injected).
import { useCallback, useEffect, useRef, useState } from 'react';
import { useGuardedAction } from './useGuarded';

export interface Loaded<T> {
  data: T;
  loading: boolean;
  error: unknown;
  reload: () => void;
}

export function useLoad<T>(load: (() => Promise<T>) | null, initial: T): Loaded<T> {
  const guard = useGuardedAction();
  const [data, setData] = useState<T>(initial);
  const [loading, setLoading] = useState(load !== null);
  const [error, setError] = useState<unknown>(null);
  const [tick, setTick] = useState(0);
  const initialRef = useRef(initial);

  useEffect(() => {
    if (!load) {
      setData(initialRef.current);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    void guard(load).then((res) => {
      if (cancelled) return;
      if (res.ok) {
        setData(res.value);
        setError(null);
      } else {
        setError(res.error);
      }
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
    // `load` identity changes with its inputs; callers memoise it.
  }, [load, guard, tick]);

  const reload = useCallback(() => setTick((t) => t + 1), []);
  return { data, loading, error, reload };
}
