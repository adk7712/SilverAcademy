// Seed voucher tiers, inventory and one upload batch (task 0.5). UC #1-6, #1-7, #5-4.
// Codes are fictional demo codes. Inventory ids are sha256 of the normalised code (architecture.md 2.2), and the
// inventory is server-only in production. Tier counts are derived from the inventory so they stay consistent.
import {
  defaultPointsCost,
  maskVoucherCode,
  voucherTierId,
  type VoucherCounts,
  type VoucherInventoryItem,
  type VoucherStatus,
  type VoucherTier,
  type VoucherUpload,
} from '@silveracademy/shared';
import { COLLECTIONS, voucherDocId } from '../ids';
import { shiftDays, toTs } from '../time';
import { seedDoc, type SeedDoc } from '../types';
import { UID, person } from './accounts';

export const VOUCHER_PROVIDER = 'DEMOVP';
const PROVIDER_NAME = 'Demo Voucher Provider';
export const UPLOAD_BATCH_ID = 'seed-batch-01';
const CODE_DENOMINATION_PAD = 2;
const CODE_INDEX_PAD = 4;
const UPLOADED_DAYS_AGO = 2;
const CLAIMED_DAYS_AGO = 1;
const INVALID_REASON = 'Reported unusable by partner (demo data).';
const REMOVED_REASON = 'Withdrawn by provider (demo data).';
const REJECTED_ROW = 21;
const DUPLICATE_SOURCE_DENOMINATION = 5;

const run = (status: VoucherStatus, count: number): VoucherStatus[] =>
  Array.from({ length: count }, () => status);

interface TierSpec {
  denomination: number;
  statuses: VoucherStatus[];
}

/** 20 codes in total. One claimed code sits in the 10-dollar tier. */
const TIER_SPECS: readonly TierSpec[] = [
  { denomination: 5, statuses: [...run('AVAILABLE', 5), 'INVALID', 'REMOVED', 'AVAILABLE'] },
  { denomination: 10, statuses: [...run('AVAILABLE', 6), 'CLAIMED', 'AVAILABLE'] },
  { denomination: 20, statuses: [...run('AVAILABLE', 3), 'INVALID'] },
];

export const codeFor = (denomination: number, index: number): string =>
  `${VOUCHER_PROVIDER}-${String(denomination).padStart(CODE_DENOMINATION_PAD, '0')}-${String(index).padStart(CODE_INDEX_PAD, '0')}`;

export interface ClaimedVoucher {
  voucherId: string;
  tierId: string;
  provider: string;
  denomination: number;
  pointsCost: number;
  claimedBy: string;
}

export interface VoucherFacts {
  docs: SeedDoc[];
  claimed: ClaimedVoucher;
}

const emptyCounts = (): VoucherCounts => ({ AVAILABLE: 0, CLAIMED: 0, INVALID: 0, REMOVED: 0 });

export function buildVoucherDocs(now: Date): VoucherFacts {
  const stamp = toTs(now);
  const uploadedAt = toTs(shiftDays(now, -UPLOADED_DAYS_AGO));
  const claimedAt = toTs(shiftDays(now, -CLAIMED_DAYS_AGO));
  const docs: SeedDoc[] = [];
  let claimed: ClaimedVoucher | undefined;

  for (const tierSpec of TIER_SPECS) {
    const tierId = voucherTierId(VOUCHER_PROVIDER, tierSpec.denomination);
    const counts = emptyCounts();

    for (let i = 0; i < tierSpec.statuses.length; i += 1) {
      const status = tierSpec.statuses[i];
      if (!status) continue;
      const code = codeFor(tierSpec.denomination, i + 1);
      const id = voucherDocId(code);
      counts[status] = (counts[status] ?? 0) + 1;
      const isClaimed = status === 'CLAIMED';
      const item: VoucherInventoryItem = {
        id,
        code,
        tierId,
        provider: VOUCHER_PROVIDER,
        denomination: tierSpec.denomination,
        status,
        ...(status === 'INVALID' ? { statusReason: INVALID_REASON } : {}),
        ...(status === 'REMOVED' ? { statusReason: REMOVED_REASON } : {}),
        uploadBatchId: UPLOAD_BATCH_ID,
        uploadedBy: UID.admin,
        uploadedAt,
        ...(isClaimed ? { claimedBy: UID.instructorAhmad, claimedAt } : {}),
        updatedAt: isClaimed ? claimedAt : stamp,
      };
      docs.push(seedDoc(`${COLLECTIONS.voucherInventory}/${id}`, item));

      if (isClaimed) {
        claimed = {
          voucherId: id,
          tierId,
          provider: VOUCHER_PROVIDER,
          denomination: tierSpec.denomination,
          pointsCost: defaultPointsCost(tierSpec.denomination),
          claimedBy: person('instructorAhmad').uid,
        };
      }
    }

    const tier: VoucherTier = {
      id: tierId,
      provider: VOUCHER_PROVIDER,
      providerName: PROVIDER_NAME,
      denomination: tierSpec.denomination,
      pointsCost: defaultPointsCost(tierSpec.denomination),
      active: true,
      counts,
      updatedAt: stamp,
    };
    docs.push(seedDoc(`${COLLECTIONS.voucherTiers}/${tierId}`, tier));
  }

  const upload: VoucherUpload = {
    id: UPLOAD_BATCH_ID,
    uploadedBy: UID.admin,
    acceptedCount: TIER_SPECS.reduce((n, t) => n + t.statuses.length, 0),
    rejectedCount: 1,
    rejected: [
      {
        row: REJECTED_ROW,
        codeMasked: maskVoucherCode(codeFor(DUPLICATE_SOURCE_DENOMINATION, 1)),
        reason: 'DUPLICATE_IN_FILE',
      },
    ],
    createdAt: uploadedAt,
  };
  docs.push(seedDoc(`${COLLECTIONS.voucherUploads}/${UPLOAD_BATCH_ID}`, upload));

  if (!claimed) throw new Error('Voucher seed must contain one claimed voucher');
  return { docs, claimed };
}
