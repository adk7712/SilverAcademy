// UC #1-7 #5-4 FR 6.27 schemas for vouchers-* callables.
import { z } from 'zod';
import { UPLOAD_REJECT_REASONS, VOUCHER_ADMIN_STATUSES, VOUCHER_STATUSES } from '../enums';
import {
  VOUCHER_DENOMINATION_MAX,
  VOUCHER_LIST_LIMIT_MAX,
  VOUCHER_PROVIDER_MAX,
  VOUCHER_PROVIDER_NAME_MAX,
} from '../constants';
import { emptyObjectSchema, idSchema, isoDateTimeSchema, reasonSchema } from './common';

const providerSchema = z.string().trim().min(1).max(VOUCHER_PROVIDER_MAX);
const denominationSchema = z.number().int().positive().max(VOUCHER_DENOMINATION_MAX);
const nonNegInt = z.number().int().nonnegative();

export const redeemVoucherInput = z.object({ tierId: idSchema });
export const redeemVoucherOutput = z.object({
  voucherId: idSchema,
  code: z.string().min(1),
  provider: z.string(),
  denomination: denominationSchema,
  pointsSpent: nonNegInt,
  balanceAfter: nonNegInt,
  claimedAt: isoDateTimeSchema,
});

export const listMyVouchersInput = emptyObjectSchema;
export const listMyVouchersOutput = z.object({
  vouchers: z.array(
    z.object({
      voucherId: idSchema,
      provider: z.string(),
      denomination: denominationSchema,
      code: z.string(),
      claimedAt: isoDateTimeSchema,
    }),
  ),
});

export const upsertTierInput = z.object({
  provider: providerSchema,
  providerName: z.string().trim().min(1).max(VOUCHER_PROVIDER_NAME_MAX),
  denomination: denominationSchema,
  pointsCost: z.number().int().positive(),
  active: z.boolean(),
});
export const upsertTierOutput = z.object({ tierId: idSchema });

export const uploadVouchersInput = z.object({
  rows: z
    .array(
      z.object({ provider: providerSchema, denomination: denominationSchema, code: z.string() }),
    )
    /** Upper bound (MAX_UPLOAD_ROWS) is UPLOAD_TOO_LARGE, checked by the handler. */
    .min(1),
});
export const uploadVouchersOutput = z.object({
  batchId: idSchema,
  acceptedCount: nonNegInt,
  rejected: z.array(
    z.object({
      row: z.number().int().positive(),
      codeMasked: z.string(),
      reason: z.enum(UPLOAD_REJECT_REASONS),
    }),
  ),
});

export const setVoucherStatusInput = z.object({
  voucherId: idSchema,
  status: z.enum(VOUCHER_ADMIN_STATUSES),
  /** Missing reason is REASON_REQUIRED, checked by the handler. */
  reason: reasonSchema.optional(),
});
export const setVoucherStatusOutput = z.object({ status: z.enum(VOUCHER_ADMIN_STATUSES) });

export const listInventoryInput = z.object({
  tierId: idSchema.optional(),
  status: z.enum(VOUCHER_STATUSES).optional(),
  limit: z.number().int().min(1).max(VOUCHER_LIST_LIMIT_MAX).optional(),
  startAfterId: idSchema.optional(),
});
export const listInventoryOutput = z.object({
  items: z.array(
    z.object({
      voucherId: idSchema,
      tierId: idSchema,
      provider: z.string(),
      denomination: denominationSchema,
      codeMasked: z.string(),
      status: z.enum(VOUCHER_STATUSES),
      uploadedAt: isoDateTimeSchema,
      claimedBy: idSchema.optional(),
      claimedAt: isoDateTimeSchema.optional(),
    }),
  ),
  nextStartAfterId: idSchema.optional(),
});
