// UC #1-7 RedeemVoucher: pure eligibility decision (architecture.md 4.4; FR 2.13-2.15, NFR 4.4).
import { AppError, type InstructorProfileStatus } from '@silveracademy/shared';

export interface RedeemTier {
  provider: string;
  denomination: number;
  pointsCost: number;
  active: boolean;
}
export interface RedeemCandidate {
  id: string;
  code: string;
  tierId: string;
  status: string;
}
export interface RedeemSnapshots {
  profileStatus: InstructorProfileStatus | undefined;
  tier: RedeemTier | undefined;
  balance: number | undefined;
  candidate: RedeemCandidate | undefined;
}
export interface RedeemDecision {
  voucherId: string;
  code: string;
  cost: number;
  provider: string;
  denomination: number;
}

/**
 * Check order (contract): PROFILE_NOT_APPROVED -> TIER_NOT_FOUND (missing or inactive) ->
 * INSUFFICIENT_POINTS (details `{ required, balance }`) -> OUT_OF_STOCK.
 */
export function decideRedeem(s: RedeemSnapshots): RedeemDecision {
  if (s.profileStatus !== 'APPROVED') throw new AppError('PROFILE_NOT_APPROVED');
  const tier = s.tier;
  if (!tier || !tier.active) throw new AppError('TIER_NOT_FOUND');
  const balance = s.balance ?? 0;
  if (balance < tier.pointsCost) {
    throw new AppError('INSUFFICIENT_POINTS', undefined, { required: tier.pointsCost, balance });
  }
  const c = s.candidate;
  if (!c || c.status !== 'AVAILABLE') throw new AppError('OUT_OF_STOCK');
  return {
    voucherId: c.id,
    code: c.code,
    cost: tier.pointsCost,
    provider: tier.provider,
    denomination: tier.denomination,
  };
}

export const redeemDescription = (providerName: string, denomination: number) =>
  `Redeemed ${providerName} $${denomination} voucher`;
