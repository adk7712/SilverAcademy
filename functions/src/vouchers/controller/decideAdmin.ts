// UC #5-4 (alt) voucher status change and tier upsert: pure admin decisions (architecture.md 4.5; functions.md 7).
import {
  AppError,
  voucherTierId,
  type VoucherAdminStatus,
  type VoucherCounts,
  type VoucherStatus,
} from '@silveracademy/shared';

/** Missing/blank reason -> REASON_REQUIRED (no longer in the zod schema, ADR-024). Returns the trimmed reason. */
export function requireReason(reason: string | undefined): string {
  const r = reason?.trim();
  if (!r) throw new AppError('REASON_REQUIRED');
  return r;
}

export interface StatusChange {
  from: VoucherStatus;
  to: VoucherAdminStatus;
  tierId: string;
}

/** Order: NOT_FOUND -> VOUCHER_NOT_AVAILABLE (only AVAILABLE -> INVALID | REMOVED). */
export function decideVoucherStatus(
  voucher: { status: VoucherStatus; tierId: string } | undefined,
  to: VoucherAdminStatus,
): StatusChange {
  if (!voucher) throw new AppError('NOT_FOUND');
  if (voucher.status !== 'AVAILABLE') {
    throw new AppError('VOUCHER_NOT_AVAILABLE', undefined, { status: voucher.status });
  }
  return { from: voucher.status, to, tierId: voucher.tierId };
}

export interface TierInput {
  provider: string;
  providerName: string;
  denomination: number;
  pointsCost: number;
  active: boolean;
}
const EMPTY_COUNTS: VoucherCounts = { AVAILABLE: 0, CLAIMED: 0, INVALID: 0, REMOVED: 0 };

/** Tier doc for create/update: id `${provider}_${denomination}`; counts initialised on create, never touched on update. */
export function decideUpsertTier(
  existing: { counts?: VoucherCounts } | undefined,
  input: TierInput,
) {
  const id = voucherTierId(input.provider, input.denomination);
  return {
    id,
    created: !existing,
    doc: {
      id,
      provider: input.provider,
      providerName: input.providerName,
      denomination: input.denomination,
      pointsCost: input.pointsCost,
      active: input.active,
      counts: existing?.counts ?? { ...EMPTY_COUNTS },
    },
  };
}
