// UC #1-5 #1-6 Live wallet + tiers + ledger with an offline flag (shows "Unable to retrieve current balance").
import { useEffect, useState } from 'react';
import { useSession } from '../../auth';
import { watchLedger, watchTiers, watchWallet } from '../repo/walletRepo';
import type { LedgerRow, TierView, WalletView } from '../types';
import { sortLedger, sortTiers } from './voucherLogic';

/** How long a cache-only answer is tolerated before we tell the user we are reconnecting. */
export const OFFLINE_GRACE_MS = 3000;

export interface WalletState {
  wallet: WalletView | null;
  tiers: TierView[];
  ledger: LedgerRow[];
  loading: boolean;
  /** True when listeners failed or only cached data has been seen for a while. */
  offline: boolean;
}

export function useWallet(withLedger: boolean): WalletState {
  const { state } = useSession();
  const uid = state.status === 'signedIn' ? state.uid : null;
  const [wallet, setWallet] = useState<WalletView | null>(null);
  const [tiers, setTiers] = useState<TierView[]>([]);
  const [ledger, setLedger] = useState<LedgerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [cached, setCached] = useState(false);
  const [graceOver, setGraceOver] = useState(false);

  useEffect(() => {
    if (!uid) {
      setLoading(false);
      return;
    }
    const fail = () => setFailed(true);
    const stops = [
      watchWallet(
        uid,
        (f) => {
          setWallet(f.data);
          setCached(f.fromCache);
          setFailed(false);
          setLoading(false);
        },
        fail,
      ),
      watchTiers((f) => setTiers(sortTiers(f.data)), fail),
    ];
    if (withLedger) stops.push(watchLedger(uid, (f) => setLedger(sortLedger(f.data)), fail));
    return () => stops.forEach((stop) => stop());
  }, [uid, withLedger]);

  useEffect(() => {
    if (!cached) {
      setGraceOver(false);
      return;
    }
    const t = setTimeout(() => setGraceOver(true), OFFLINE_GRACE_MS);
    return () => clearTimeout(t);
  }, [cached]);

  return {
    wallet,
    tiers,
    ledger,
    loading: loading && !failed,
    offline: failed || (cached && graceOver),
  };
}
