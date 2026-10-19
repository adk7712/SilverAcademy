// UC #1-7 #5-4 voucher code normalise/validate/mask and upload row classification (architecture.md 4.5).
import {
  POINTS_PER_SGD,
  VOUCHER_CODE_REGEX,
  VOUCHER_MASK_PREFIX,
  VOUCHER_MASK_VISIBLE,
} from '../constants';
import type { UploadRejectReason } from '../enums';

export const normaliseVoucherCode = (code: string) => code.trim().toUpperCase();
export const isValidVoucherCode = (code: string) =>
  VOUCHER_CODE_REGEX.test(normaliseVoucherCode(code));

/** `ABCD-1234` -> `****1234` (codes never leave the server unmasked except to the owner). */
export const maskVoucherCode = (code: string) =>
  `${VOUCHER_MASK_PREFIX}${normaliseVoucherCode(code).slice(-VOUCHER_MASK_VISIBLE)}`;

export const voucherTierId = (provider: string, denomination: number) =>
  `${provider}_${denomination}`;
export const defaultPointsCost = (denomination: number) => denomination * POINTS_PER_SGD;

export interface UploadRow {
  provider: string;
  denomination: number;
  code: string;
}
export interface UploadRowVerdict {
  row: number; // 1-based
  normalisedCode: string;
  tierId: string;
  reason?: UploadRejectReason;
}

/**
 * Pre-transaction classification. Check order: INVALID_FORMAT, UNKNOWN_TIER, DUPLICATE_IN_FILE.
 * `DUPLICATE_EXISTING` is decided in the transaction against stored ids.
 */
export function classifyUploadRows(
  rows: readonly UploadRow[],
  activeTierIds: ReadonlySet<string>,
): UploadRowVerdict[] {
  const seen = new Set<string>();
  return rows.map((r, i) => {
    const normalisedCode = normaliseVoucherCode(r.code);
    const tierId = voucherTierId(r.provider, r.denomination);
    const base = { row: i + 1, normalisedCode, tierId };
    if (!VOUCHER_CODE_REGEX.test(normalisedCode))
      return { ...base, reason: 'INVALID_FORMAT' as const };
    if (!activeTierIds.has(tierId)) return { ...base, reason: 'UNKNOWN_TIER' as const };
    if (seen.has(normalisedCode)) return { ...base, reason: 'DUPLICATE_IN_FILE' as const };
    seen.add(normalisedCode);
    return base;
  });
}
