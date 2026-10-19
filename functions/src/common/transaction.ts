// Transaction runner (architecture.md section 4 preamble): Admin SDK tx, reads before writes, ABORTED -> BUSY_TRY_AGAIN.
import type { Firestore, Transaction } from 'firebase-admin/firestore';
import { toAppError } from './errors';

const TX_MAX_ATTEMPTS = 5;

/**
 * Runs `fn` in a Firestore transaction. Rules for `fn`: all `tx.get` first, then writes; call the pure
 * `decide*` between them; do not catch AppError inside (a throw aborts every write). Contention that outlives
 * the retries surfaces as AppError BUSY_TRY_AGAIN; other errors propagate unchanged (the callable wrapper maps them).
 */
export async function runTx<T>(
  db: Firestore,
  fn: (tx: Transaction) => Promise<T>,
  maxAttempts: number = TX_MAX_ATTEMPTS,
): Promise<T> {
  try {
    return await db.runTransaction(fn, { maxAttempts });
  } catch (e) {
    const mapped = toAppError(e);
    if (mapped.code === 'BUSY_TRY_AGAIN') throw mapped;
    throw e;
  }
}
