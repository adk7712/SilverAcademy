// Seed wallets and immutable ledgers (task 0.5). UC #1-5, #1-6, #1-7.
// Balance and lifetime totals are derived from the ledger, so balance == sum(ledger.amount) holds (architecture.md 2.4).
import {
  POINTS_PER_ATTENDANCE,
  type Attendance,
  type LedgerEntry,
  type Wallet,
} from '@silveracademy/shared';
import { COLLECTIONS } from '../ids';
import { shiftDays, toTs } from '../time';
import { seedDoc, type SeedDoc } from '../types';
import type { ClaimedVoucher } from './vouchers';
import { workshopSpec } from './workshopSpecs';

/** Starting points granted to each seeded instructor so redemption is demonstrable. */
const SEED_STARTING_POINTS = 30;
const SEED_STARTING_DAYS_AGO = 30;
const REDEEM_DAYS_AGO = 1;
const STARTING_ENTRY_ID = 'seed-adjust-starting';

type DraftEntry = Omit<LedgerEntry, 'balanceAfter'>;

export interface WalletInputs {
  instructorUids: string[];
  attendance: Attendance[];
  claimed: ClaimedVoucher;
}

export function buildWalletDocs(now: Date, inputs: WalletInputs): SeedDoc[] {
  const stamp = toTs(now);
  const docs: SeedDoc[] = [];

  for (const uid of inputs.instructorUids) {
    const drafts: DraftEntry[] = [
      {
        id: STARTING_ENTRY_ID,
        type: 'ADJUSTMENT',
        amount: SEED_STARTING_POINTS,
        description: 'Demo seed starting balance.',
        createdAt: toTs(shiftDays(now, -SEED_STARTING_DAYS_AGO)),
      },
    ];

    for (const a of inputs.attendance.filter((x) => x.instructorId === uid)) {
      drafts.push({
        id: `earn_${a.bookingId}`,
        type: 'EARN_ATTENDANCE',
        amount: POINTS_PER_ATTENDANCE,
        workshopId: a.workshopId,
        workshopTitle: workshopSpec(a.workshopId).title,
        bookingId: a.bookingId,
        description: 'Points for learner attendance.',
        createdAt: a.createdAt,
      });
    }

    if (inputs.claimed.claimedBy === uid) {
      drafts.push({
        id: `redeem_${inputs.claimed.voucherId}`,
        type: 'REDEEM_VOUCHER',
        amount: -inputs.claimed.pointsCost,
        voucherId: inputs.claimed.voucherId,
        tierId: inputs.claimed.tierId,
        provider: inputs.claimed.provider,
        denomination: inputs.claimed.denomination,
        description: 'Voucher redeemed (code not stored in ledger).',
        createdAt: toTs(shiftDays(now, -REDEEM_DAYS_AGO)),
      });
    }

    let running = 0;
    let earned = 0;
    let redeemed = 0;
    for (const draft of drafts) {
      running += draft.amount;
      if (draft.amount > 0) earned += draft.amount;
      else redeemed -= draft.amount;
      const entry: LedgerEntry = { ...draft, balanceAfter: running };
      docs.push(seedDoc(`${COLLECTIONS.wallets}/${uid}/${COLLECTIONS.ledger}/${entry.id}`, entry));
    }

    const wallet: Wallet = {
      uid,
      balance: running,
      lifetimeEarned: earned,
      lifetimeRedeemed: redeemed,
      updatedAt: stamp,
    };
    docs.push(seedDoc(`${COLLECTIONS.wallets}/${uid}`, wallet));
  }
  return docs;
}
