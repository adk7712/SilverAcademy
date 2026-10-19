// UC #5-4: hooks wiring the voucher repo to UI state (tiers + paged inventory).
import { useCallback, useEffect, useRef, useState } from 'react';
import type { VoucherStatus } from '@silveracademy/shared';
import { useSessionGuard } from '../../auth';
import { fetchInventory, fetchTiers } from '../repo/voucherRepo';
import type { InventoryItem, TierView } from '../types';

export function useTiers() {
  const onSessionError = useSessionGuard();
  const [tiers, setTiers] = useState<TierView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    let live = true; // ignore responses from a superseded reload
    setLoading(true);
    setError(null);
    fetchTiers().then(
      (list) => {
        if (!live) return;
        setTiers(list);
        setLoading(false);
      },
      (e: unknown) => {
        if (!live) return;
        setError(e);
        setLoading(false);
        onSessionError(e);
      },
    );
    return () => {
      live = false;
    };
  }, [tick, onSessionError]);
  const reload = useCallback(() => setTick((t) => t + 1), []);
  return { tiers, loading, error, reload };
}

export interface InventoryFilters {
  tierId: string;
  status: VoucherStatus | '';
}

export function useInventory(filters: InventoryFilters) {
  const onSessionError = useSessionGuard();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [next, setNext] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const { tierId, status } = filters;
  // Only the latest request may update state (filter change, reload or load-more can overlap).
  const requestSeq = useRef(0);

  const load = useCallback(
    async (after?: string) => {
      const seq = ++requestSeq.current;
      setLoading(true);
      setError(null);
      try {
        const page = await fetchInventory({
          ...(tierId && { tierId }),
          ...(status && { status }),
          ...(after && { startAfterId: after }),
        });
        if (seq !== requestSeq.current) return;
        setItems((prev) => (after ? [...prev, ...page.items] : page.items));
        setNext(page.nextStartAfterId);
        setLoading(false);
      } catch (e) {
        if (seq !== requestSeq.current) return;
        setError(e);
        setLoading(false);
        onSessionError(e);
      }
    },
    [tierId, status, onSessionError],
  );
  useEffect(() => {
    void load();
    return () => {
      requestSeq.current++; // invalidate in-flight request on filter change / unmount
    };
  }, [load]);
  return {
    items,
    loading,
    error,
    hasMore: next !== undefined,
    loadMore: () => load(next),
    reload: () => load(),
  };
}
