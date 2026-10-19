// UC #5-4 admin voucher writes: status change (AVAILABLE -> INVALID|REMOVED) and tier upsert, each one tx + audit.
import { FieldValue, type Firestore } from 'firebase-admin/firestore';
import {
  voucherTierId,
  type VoucherAdminStatus,
  type VoucherCounts,
  type VoucherStatus,
} from '@silveracademy/shared';
import { COL, runTx, writeAuditTx } from '../../common';
import { decideUpsertTier, decideVoucherStatus, type TierInput } from '../controller/decideAdmin';

export async function setVoucherStatusTx(
  db: Firestore,
  adminUid: string,
  voucherId: string,
  to: VoucherAdminStatus,
  reason: string,
): Promise<{ status: VoucherAdminStatus }> {
  const voucherRef = db.collection(COL.voucherInventory).doc(voucherId);
  return runTx(db, async (tx) => {
    const snap = await tx.get(voucherRef);
    const v = snap.exists ? (snap.data() as { status: VoucherStatus; tierId: string }) : undefined;
    const change = decideVoucherStatus(v, to);
    tx.update(voucherRef, {
      status: to,
      statusReason: reason,
      updatedAt: FieldValue.serverTimestamp(),
    });
    tx.update(db.collection(COL.voucherTiers).doc(change.tierId), {
      [`counts.${change.from}`]: FieldValue.increment(-1),
      [`counts.${to}`]: FieldValue.increment(1),
      updatedAt: FieldValue.serverTimestamp(),
    });
    writeAuditTx(db, tx, {
      actorId: adminUid,
      actorRole: 'ADMIN',
      action: 'VOUCHER_STATUS_CHANGE',
      outcome: 'SUCCESS',
      targetType: 'VOUCHER',
      targetId: voucherId,
      details: { from: change.from, to, tierId: change.tierId, reason },
    });
    return { status: to };
  });
}

export async function upsertTierTx(
  db: Firestore,
  adminUid: string,
  input: TierInput,
): Promise<{ tierId: string }> {
  return runTx(db, async (tx) => {
    const ref = db
      .collection(COL.voucherTiers)
      .doc(voucherTierId(input.provider, input.denomination));
    const snap = await tx.get(ref);
    const existing = snap.exists ? (snap.data() as { counts?: VoucherCounts }) : undefined;
    const d = decideUpsertTier(existing, input);
    tx.set(ref, { ...d.doc, updatedAt: FieldValue.serverTimestamp() });
    writeAuditTx(db, tx, {
      actorId: adminUid,
      actorRole: 'ADMIN',
      action: 'VOUCHER_TIER_UPSERT',
      outcome: 'SUCCESS',
      targetType: 'VOUCHER_TIER',
      targetId: d.id,
      details: { created: d.created, pointsCost: input.pointsCost, active: input.active },
    });
    return { tierId: d.id };
  });
}
