// UC #1-7 RedeemVoucher transaction (architecture.md 4.4): one tx, all-or-nothing; the code is never logged.
import { FieldValue, Timestamp, type Firestore } from 'firebase-admin/firestore';
import type { Role } from '@silveracademy/shared';
import {
  COL,
  ids,
  refs,
  runTx,
  writeAuditTx,
  writeLedgerTx,
  type WalletSnapshot,
} from '../../common';
import {
  decideRedeem,
  redeemDescription,
  type RedeemCandidate,
  type RedeemTier,
} from '../controller/decideRedeem';

export interface RedeemResult {
  voucherId: string;
  code: string;
  provider: string;
  denomination: number;
  pointsSpent: number;
  balanceAfter: number;
  claimedAt: string;
}

export async function redeemVoucherTx(
  db: Firestore,
  uid: string,
  actorRole: Role,
  tierId: string,
  now: Date,
): Promise<RedeemResult> {
  const tierRef = db.collection(COL.voucherTiers).doc(tierId);
  const walletRef = refs.wallets(db).doc(uid);
  const profileRef = refs.instructorProfiles(db).doc(uid);
  const candidateQuery = db
    .collection(COL.voucherInventory)
    .where('tierId', '==', tierId)
    .where('status', '==', 'AVAILABLE')
    .orderBy('uploadedAt')
    .limit(1);

  return runTx(db, async (tx) => {
    // Reads (all before any write).
    const [profileSnap, tierSnap, walletSnap, candidates] = await Promise.all([
      tx.get(profileRef),
      tx.get(tierRef),
      tx.get(walletRef),
      tx.get(candidateQuery),
    ]);
    const tier = tierSnap.data() as (RedeemTier & { providerName?: string }) | undefined;
    const wallet = walletSnap.data() as WalletSnapshot | undefined;
    const first = candidates.docs[0];
    const d = decideRedeem({
      profileStatus: profileSnap.data()?.status,
      tier,
      balance: wallet?.balance,
      candidate: first ? ({ ...first.data(), id: first.id } as RedeemCandidate) : undefined,
    });

    // Writes.
    const claimedAt = Timestamp.fromDate(now);
    tx.update(db.collection(COL.voucherInventory).doc(d.voucherId), {
      status: 'CLAIMED',
      claimedBy: uid,
      claimedAt,
      updatedAt: FieldValue.serverTimestamp(),
    });
    const plan = writeLedgerTx(db, tx, uid, wallet, {
      entryId: ids.redeemEntry(d.voucherId),
      type: 'REDEEM_VOUCHER',
      amount: -d.cost,
      description: redeemDescription(tier?.providerName ?? d.provider, d.denomination),
      voucherId: d.voucherId,
      tierId,
      provider: d.provider,
      denomination: d.denomination,
    });
    tx.update(tierRef, {
      'counts.AVAILABLE': FieldValue.increment(-1),
      'counts.CLAIMED': FieldValue.increment(1),
      updatedAt: FieldValue.serverTimestamp(),
    });
    writeAuditTx(db, tx, {
      actorId: uid,
      actorRole,
      action: 'VOUCHER_REDEEM',
      outcome: 'SUCCESS',
      targetType: 'VOUCHER',
      targetId: d.voucherId,
      details: { tierId, pointsSpent: d.cost, balanceAfter: plan.wallet.balance },
    });

    return {
      voucherId: d.voucherId,
      code: d.code,
      provider: d.provider,
      denomination: d.denomination,
      pointsSpent: d.cost,
      balanceAfter: plan.wallet.balance,
      claimedAt: now.toISOString(),
    };
  });
}
