// UC #5-4 UploadVouchers: pure classification + dedupe decision (architecture.md 4.5; FR 6.23-6.29; ADR-011/012).
import { createHash } from 'node:crypto';
import {
  AppError,
  classifyUploadRows,
  maskVoucherCode,
  voucherTierId,
  type RejectedUploadRow,
  type UploadRow,
} from '@silveracademy/shared';
import { MAX_TX_WRITES, UPLOAD_FIXED_WRITES } from '../constants';

/** voucherInventory doc id: sha256 hex of the normalised code (doc id doubles as the dedupe key). */
export const voucherDocId = (normalisedCode: string) =>
  createHash('sha256').update(normalisedCode).digest('hex');

export interface UploadSurvivor {
  row: number;
  id: string;
  code: string;
  tierId: string;
  provider: string;
  denomination: number;
}
export interface UploadPlan {
  survivors: UploadSurvivor[];
  rejected: RejectedUploadRow[];
}
export interface UploadDecision {
  accepted: UploadSurvivor[];
  rejected: RejectedUploadRow[];
  /** Accepted count per tier, for `counts.AVAILABLE += n`. */
  perTier: Record<string, number>;
}

/** Distinct tier ids referenced by the rows (read these in the tx to know which are active). */
export const referencedTierIds = (rows: readonly UploadRow[]) => [
  ...new Set(rows.map((r) => voucherTierId(r.provider, r.denomination))),
];

/** Step 1 (no inventory reads): INVALID_FORMAT -> UNKNOWN_TIER -> DUPLICATE_IN_FILE; survivors get their doc id. */
export function planUpload(
  rows: readonly UploadRow[],
  activeTierIds: ReadonlySet<string>,
): UploadPlan {
  const survivors: UploadSurvivor[] = [];
  const rejected: RejectedUploadRow[] = [];
  classifyUploadRows(rows, activeTierIds).forEach((v, i) => {
    const src = rows[i] as UploadRow;
    if (v.reason) {
      rejected.push({ row: v.row, codeMasked: maskVoucherCode(src.code), reason: v.reason });
      return;
    }
    survivors.push({
      row: v.row,
      id: voucherDocId(v.normalisedCode),
      code: v.normalisedCode,
      tierId: v.tierId,
      provider: src.provider,
      denomination: src.denomination,
    });
  });
  return { survivors, rejected };
}

/**
 * Step 2 (after `tx.getAll(survivor refs)`): ids already stored -> DUPLICATE_EXISTING; the rest are accepted.
 * Throws UPLOAD_TOO_LARGE if the commit would exceed the per-transaction write cap (all-or-nothing, nothing written).
 */
export function decideUpload(plan: UploadPlan, existingIds: ReadonlySet<string>): UploadDecision {
  const accepted: UploadSurvivor[] = [];
  const rejected = [...plan.rejected];
  const perTier: Record<string, number> = {};
  for (const s of plan.survivors) {
    if (existingIds.has(s.id)) {
      rejected.push({
        row: s.row,
        codeMasked: maskVoucherCode(s.code),
        reason: 'DUPLICATE_EXISTING',
      });
      continue;
    }
    accepted.push(s);
    perTier[s.tierId] = (perTier[s.tierId] ?? 0) + 1;
  }
  const writes = accepted.length + Object.keys(perTier).length + UPLOAD_FIXED_WRITES;
  if (writes > MAX_TX_WRITES) {
    throw new AppError('UPLOAD_TOO_LARGE', undefined, { writes, max: MAX_TX_WRITES });
  }
  rejected.sort((a, b) => a.row - b.row);
  return { accepted, rejected, perTier };
}
