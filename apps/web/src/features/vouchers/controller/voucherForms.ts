// UC #5-4: validation for the status-change reason and tier form (pure; server re-validates).
import { REASON_MAX, VOUCHER_DENOMINATION_MAX } from '@silveracademy/shared';

export type ReasonCheck = { ok: true; reason: string } | { ok: false };

export function checkReason(raw: string): ReasonCheck {
  const reason = raw.trim().slice(0, REASON_MAX);
  return reason ? { ok: true, reason } : { ok: false };
}

export interface TierFormValues {
  provider: string;
  providerName: string;
  denomination: string;
  pointsCost: string;
  active: boolean;
}
export type TierFormErrors = Partial<
  Record<'provider' | 'providerName' | 'denomination' | 'pointsCost', 'required' | 'number'>
>;
export interface TierInput {
  provider: string;
  providerName: string;
  denomination: number;
  pointsCost: number;
  active: boolean;
}

const toPositiveInt = (s: string, max = Number.MAX_SAFE_INTEGER): number | null => {
  const n = Number(s.trim());
  return s.trim() !== '' && Number.isInteger(n) && n > 0 && n <= max ? n : null;
};

export function validateTier(
  v: TierFormValues,
): { ok: true; input: TierInput } | { ok: false; errors: TierFormErrors } {
  const errors: TierFormErrors = {};
  const provider = v.provider.trim();
  const providerName = v.providerName.trim();
  if (!provider) errors.provider = 'required';
  if (!providerName) errors.providerName = 'required';
  const denomination = toPositiveInt(v.denomination, VOUCHER_DENOMINATION_MAX);
  const pointsCost = toPositiveInt(v.pointsCost);
  if (denomination === null) errors.denomination = 'number';
  if (pointsCost === null) errors.pointsCost = 'number';
  if (Object.keys(errors).length > 0 || denomination === null || pointsCost === null)
    return { ok: false, errors };
  return {
    ok: true,
    input: { provider, providerName, denomination, pointsCost, active: v.active },
  };
}
