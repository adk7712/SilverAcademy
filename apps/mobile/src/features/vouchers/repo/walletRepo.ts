// UC #1-5 #1-6 Direct Firestore reads: wallet doc, points ledger, active voucher tiers (functions.md section 7).
import {
  collection,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  where,
  type DocumentData,
} from 'firebase/firestore';
import type { LedgerEntry, VoucherTier, Wallet } from '@silveracademy/shared';
import { firestore } from '../../../services/firebase';
import type { LedgerRow, TierView, WalletView } from '../types';

const LEDGER_LIMIT = 100;

/** `fromCache` with no server answer yet is how Firestore signals being offline. */
export interface Feed<T> {
  data: T;
  fromCache: boolean;
}

export function watchWallet(
  uid: string,
  onData: (feed: Feed<WalletView | null>) => void,
  onError: (e: unknown) => void,
): () => void {
  return onSnapshot(
    doc(firestore, 'wallets', uid),
    { includeMetadataChanges: true },
    (snap) => {
      const w = snap.data() as Partial<Wallet> | undefined;
      onData({
        fromCache: snap.metadata.fromCache,
        data: w ? { balance: w.balance ?? 0, lifetimeEarned: w.lifetimeEarned ?? 0 } : null,
      });
    },
    onError,
  );
}

export function watchTiers(
  onData: (feed: Feed<TierView[]>) => void,
  onError: (e: unknown) => void,
): () => void {
  return onSnapshot(
    query(collection(firestore, 'voucherTiers'), where('active', '==', true)),
    { includeMetadataChanges: true },
    (snap) =>
      onData({
        fromCache: snap.metadata.fromCache,
        data: snap.docs.map((d) => {
          const t = d.data() as VoucherTier;
          return {
            id: d.id,
            provider: t.provider,
            providerName: t.providerName,
            denomination: t.denomination,
            pointsCost: t.pointsCost,
          };
        }),
      }),
    onError,
  );
}

export function watchLedger(
  uid: string,
  onData: (feed: Feed<LedgerRow[]>) => void,
  onError: (e: unknown) => void,
): () => void {
  return onSnapshot(
    query(
      collection(firestore, 'wallets', uid, 'ledger'),
      orderBy('createdAt', 'desc'),
      limit(LEDGER_LIMIT),
    ),
    { includeMetadataChanges: true },
    (snap) =>
      onData({
        fromCache: snap.metadata.fromCache,
        data: snap.docs.map((d) => toLedgerRow(d.id, d.data())),
      }),
    onError,
  );
}

function toLedgerRow(id: string, data: DocumentData): LedgerRow {
  const e = data as Partial<LedgerEntry>;
  return {
    id,
    type: e.type ?? 'ADJUSTMENT',
    amount: e.amount ?? 0,
    balanceAfter: e.balanceAfter ?? 0,
    description: e.description ?? '',
    workshopTitle: e.workshopTitle,
    provider: e.provider,
    denomination: e.denomination,
    // Pending server timestamps are null locally; treat as "now".
    createdAtMs: e.createdAt?.toDate ? e.createdAt.toDate().getTime() : Date.now(),
  };
}
