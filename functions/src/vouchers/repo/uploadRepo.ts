// UC #5-4 UploadVouchers transaction (architecture.md 4.5): dedupe via sha256 doc ids, valid rows all-or-nothing.
import { FieldValue, Timestamp, type Firestore } from 'firebase-admin/firestore';
import type { RejectedUploadRow, UploadRow } from '@silveracademy/shared';
import { COL, runTx, writeAuditTx } from '../../common';
import { decideUpload, planUpload, referencedTierIds } from '../controller/decideUpload';

export interface UploadResult {
  batchId: string;
  acceptedCount: number;
  rejected: RejectedUploadRow[];
}

export async function uploadVouchersTx(
  db: Firestore,
  adminUid: string,
  rows: readonly UploadRow[],
  now: Date,
): Promise<UploadResult> {
  const inventory = db.collection(COL.voucherInventory);
  const tiers = db.collection(COL.voucherTiers);
  const batchRef = db.collection(COL.voucherUploads).doc();

  return runTx(db, async (tx) => {
    // Reads: referenced tiers, then the survivors' inventory ids.
    const tierIds = referencedTierIds(rows);
    const tierSnaps = await tx.getAll(...tierIds.map((id) => tiers.doc(id)));
    const active = new Set(
      tierSnaps.filter((s) => s.exists && s.get('active') === true).map((s) => s.id),
    );
    const plan = planUpload(rows, active);
    const survivorSnaps = plan.survivors.length
      ? await tx.getAll(...plan.survivors.map((s) => inventory.doc(s.id)))
      : [];
    const existing = new Set(survivorSnaps.filter((s) => s.exists).map((s) => s.id));
    const d = decideUpload(plan, existing);

    // Writes.
    const uploadedAt = Timestamp.fromDate(now);
    for (const v of d.accepted) {
      tx.create(inventory.doc(v.id), {
        id: v.id,
        code: v.code,
        tierId: v.tierId,
        provider: v.provider,
        denomination: v.denomination,
        status: 'AVAILABLE',
        uploadBatchId: batchRef.id,
        uploadedBy: adminUid,
        uploadedAt,
        updatedAt: FieldValue.serverTimestamp(),
      });
    }
    for (const [tierId, n] of Object.entries(d.perTier)) {
      tx.update(tiers.doc(tierId), {
        'counts.AVAILABLE': FieldValue.increment(n),
        updatedAt: FieldValue.serverTimestamp(),
      });
    }
    tx.create(batchRef, {
      id: batchRef.id,
      uploadedBy: adminUid,
      acceptedCount: d.accepted.length,
      rejectedCount: d.rejected.length,
      rejected: d.rejected,
      createdAt: FieldValue.serverTimestamp(),
    });
    writeAuditTx(db, tx, {
      actorId: adminUid,
      actorRole: 'ADMIN',
      action: 'VOUCHER_UPLOAD',
      outcome: 'SUCCESS',
      targetType: 'VOUCHER_UPLOAD',
      targetId: batchRef.id,
      details: { acceptedCount: d.accepted.length, rejectedCount: d.rejected.length },
    });
    return { batchId: batchRef.id, acceptedCount: d.accepted.length, rejected: d.rejected };
  });
}
