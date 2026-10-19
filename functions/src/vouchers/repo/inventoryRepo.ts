// UC #1-7 #5-4 FR 6.27 inventory reads: admin listing (masked) and an instructor's own claimed vouchers.
import { FieldPath, type Firestore } from 'firebase-admin/firestore';
import type { VoucherStatus } from '@silveracademy/shared';
import { COL } from '../../common';
import { toInventoryItem, toMyVoucher, type StoredVoucher } from '../controller/views';

export interface InventoryQuery {
  tierId?: string;
  status?: VoucherStatus;
  limit: number;
  startAfterId?: string;
}

/**
 * Equality filters + document-id order (no composite index needed); paginated by `startAfterId`.
 * Grouped counts (provider/denomination/status) come from `voucherTiers.counts`, not from here.
 */
export async function listInventoryPage(db: Firestore, q: InventoryQuery) {
  let query = db.collection(COL.voucherInventory).orderBy(FieldPath.documentId());
  if (q.tierId) query = query.where('tierId', '==', q.tierId);
  if (q.status) query = query.where('status', '==', q.status);
  if (q.startAfterId) query = query.startAfter(q.startAfterId);
  const snap = await query.limit(q.limit + 1).get();
  const docs = snap.docs.slice(0, q.limit);
  const items = docs.map((d) => toInventoryItem({ ...(d.data() as StoredVoucher), id: d.id }));
  const last = docs[docs.length - 1];
  return snap.docs.length > q.limit && last ? { items, nextStartAfterId: last.id } : { items };
}

/** Vouchers claimed by `uid`, newest first (index: claimedBy ASC, claimedAt DESC). */
export async function listClaimedBy(db: Firestore, uid: string) {
  const snap = await db
    .collection(COL.voucherInventory)
    .where('claimedBy', '==', uid)
    .orderBy('claimedAt', 'desc')
    .get();
  return snap.docs.map((d) => toMyVoucher({ ...(d.data() as StoredVoucher), id: d.id }));
}
