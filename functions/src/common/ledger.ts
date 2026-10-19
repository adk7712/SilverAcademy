// Wallet + immutable ledger writer (architecture.md 2.4, 4.3, 4.4). Invariant: wallet.balance == sum(ledger.amount).
import { FieldValue, type Firestore, type Transaction } from 'firebase-admin/firestore';
import { AppError, type LedgerEntry, type LedgerEntryType } from '@silveracademy/shared';
import { COL } from './refs';

export interface WalletSnapshot {
  balance: number;
  lifetimeEarned: number;
  lifetimeRedeemed: number;
}

export interface LedgerInput {
  /** Deterministic for EARN (`ids.earnEntry`) and REDEEM (`ids.redeemEntry`) so replays collide on create. */
  entryId: string;
  type: LedgerEntryType;
  /** Signed: positive earns, negative spends. */
  amount: number;
  description: string;
  workshopId?: string;
  workshopTitle?: string;
  bookingId?: string;
  voucherId?: string;
  tierId?: string;
  provider?: string;
  denomination?: number;
}

export interface WalletPlan {
  wallet: WalletSnapshot;
  entry: Omit<LedgerEntry, 'createdAt'>;
}

const EMPTY_WALLET: WalletSnapshot = { balance: 0, lifetimeEarned: 0, lifetimeRedeemed: 0 };

/**
 * Pure: next wallet state and ledger entry. A missing wallet counts as zero.
 * Throws INSUFFICIENT_POINTS (details `{ required, balance }`) if the balance would go negative.
 */
export function planLedgerEntry(
  current: WalletSnapshot | undefined,
  input: LedgerInput,
): WalletPlan {
  const w = current ?? EMPTY_WALLET;
  const balance = w.balance + input.amount;
  if (balance < 0) {
    throw new AppError('INSUFFICIENT_POINTS', undefined, {
      required: -input.amount,
      balance: w.balance,
    });
  }
  const { entryId, ...rest } = input;
  return {
    wallet: {
      balance,
      lifetimeEarned: w.lifetimeEarned + (input.amount > 0 ? input.amount : 0),
      lifetimeRedeemed: w.lifetimeRedeemed + (input.amount < 0 ? -input.amount : 0),
    },
    entry: { id: entryId, ...rest, balanceAfter: balance },
  };
}

/**
 * Writes wallet (`set`, creates if missing) and `ledger/{entryId}` (`create`, so replays fail) in the tx.
 * Read the wallet with `tx.get` BEFORE any write, then pass its data (or undefined) as `current`.
 */
export function writeLedgerTx(
  db: Firestore,
  tx: Transaction,
  uid: string,
  current: WalletSnapshot | undefined,
  input: LedgerInput,
): WalletPlan {
  const plan = planLedgerEntry(current, input);
  const walletRef = db.collection(COL.wallets).doc(uid);
  tx.set(walletRef, { uid, ...plan.wallet, updatedAt: FieldValue.serverTimestamp() });
  tx.create(walletRef.collection(COL.ledger).doc(input.entryId), {
    ...plan.entry,
    createdAt: FieldValue.serverTimestamp(),
  });
  return plan;
}
