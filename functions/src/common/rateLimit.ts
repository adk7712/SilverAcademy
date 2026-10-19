// Fixed-window rate limiter on rateLimits/{key} (server-only collection, denied by rules). Review M3.
import { createHash } from 'node:crypto';
import type { Firestore } from 'firebase-admin/firestore';
import { COL } from './refs';
import { runTx } from './transaction';

const RATE_WINDOW_MS = 60_000;

interface Bucket {
  windowStart: number;
  count: number;
}

/** Pure: next bucket state, or null when the window is exhausted. */
export function nextBucket(
  current: Bucket | undefined,
  limit: number,
  windowMs: number,
  nowMs: number,
): Bucket | null {
  const fresh = !current || nowMs - current.windowStart >= windowMs;
  const count = fresh ? 0 : current.count;
  if (count >= limit) return null;
  return { windowStart: fresh ? nowMs : current.windowStart, count: count + 1 };
}

/** Stable, doc-id-safe key part for arbitrary user input. */
export const rateKeyPart = (value: string): string =>
  createHash('sha256').update(value).digest('hex').slice(0, 16);

/** Takes one token from `key`'s window. Returns false when the limit is reached (caller should drop the work). */
export async function takeRateToken(
  db: Firestore,
  key: string,
  limit: number,
  now: Date,
  windowMs: number = RATE_WINDOW_MS,
): Promise<boolean> {
  const ref = db.collection(COL.rateLimits).doc(key);
  return runTx(db, async (tx) => {
    const snap = await tx.get(ref);
    const next = nextBucket(snap.data() as Bucket | undefined, limit, windowMs, now.getTime());
    if (!next) return false;
    tx.set(ref, next);
    return true;
  });
}
