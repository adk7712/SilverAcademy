// UC #1-7 My vouchers list via listMyVouchers.
import { useCallback, useEffect, useState } from 'react';
import { errorMessage } from '../../../services/errors/errorMessage';
import { listMyVouchersCall } from '../repo/voucherCallsRepo';
import type { MyVoucherView } from '../types';

export function useMyVouchers() {
  const [items, setItems] = useState<MyVoucherView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setItems(await listMyVouchersCall());
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return { items, loading, error, reload: load };
}
