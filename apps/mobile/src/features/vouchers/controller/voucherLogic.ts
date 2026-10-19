// UC #1-5 #1-6 #1-7 Pure wallet/redeem rules for the UI (server stays authoritative). No Firebase or RN imports.
import { AppError, isAppError } from '@silveracademy/shared';
import type { LedgerRow, RedeemFailure, TierView } from '../types';

export const sortTiers = (tiers: readonly TierView[]): TierView[] =>
  [...tiers].sort(
    (a, b) =>
      a.pointsCost - b.pointsCost ||
      a.providerName.localeCompare(b.providerName) ||
      a.denomination - b.denomination,
  );

export const isAffordable = (tier: TierView, balance: number) => balance >= tier.pointsCost;
export const shortfall = (tier: TierView, balance: number) =>
  Math.max(0, tier.pointsCost - balance);

/** Newest first; ties keep a stable order by id. */
export const sortLedger = (rows: readonly LedgerRow[]): LedgerRow[] =>
  [...rows].sort((a, b) => b.createdAtMs - a.createdAtMs || a.id.localeCompare(b.id));

export const formatDate = (ms: number): string =>
  new Date(ms).toLocaleDateString('en-SG', { day: 'numeric', month: 'short', year: 'numeric' });

/** Title line for a ledger row: workshop title, or the voucher that was bought, else the stored description. */
export function ledgerTitle(row: LedgerRow): string {
  if (row.type === 'EARN_ATTENDANCE' && row.workshopTitle) return row.workshopTitle;
  if (row.type === 'REDEEM_VOUCHER' && row.provider && row.denomination)
    return `${row.provider} S$${row.denomination}`;
  return row.description;
}

/** Maps a failed redeem call to what the user should see. Points are never deducted on any failure. */
export function toRedeemFailure(
  error: unknown,
  fallbackMessage: (e: unknown) => string,
): RedeemFailure {
  if (isAppError(error)) {
    if (error.code === 'INSUFFICIENT_POINTS') return insufficient(error);
    if (error.code === 'BUSY_TRY_AGAIN') return { kind: 'BUSY' };
  }
  return { kind: 'OTHER', message: fallbackMessage(error) };
}

function insufficient(error: AppError): RedeemFailure {
  const num = (v: unknown) => (typeof v === 'number' ? v : 0);
  return {
    kind: 'INSUFFICIENT',
    required: num(error.details?.required),
    balance: num(error.details?.balance),
  };
}

/** Single-flight guard so a double tap cannot fire two redeem calls. */
export function createSingleFlight() {
  let busy = false;
  return async <T>(task: () => Promise<T>): Promise<T | undefined> => {
    if (busy) return undefined;
    busy = true;
    try {
      return await task();
    } finally {
      busy = false;
    }
  };
}
