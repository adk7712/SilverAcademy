// UC #1-7 RedeemVoucher flow state: select -> confirm -> call -> success/failure. Single-flight against double taps.
import { useCallback, useRef, useState } from 'react';
import { errorMessage } from '../../../services/errors/errorMessage';
import { redeemVoucherCall } from '../repo/voucherCallsRepo';
import type { RedeemFailure, RedeemedView, TierView } from '../types';
import { createSingleFlight, toRedeemFailure } from './voucherLogic';

export interface RedeemApi {
  selected: TierView | null;
  select: (t: TierView) => void;
  confirming: boolean;
  openConfirm: () => void;
  cancelConfirm: () => void;
  submitting: boolean;
  confirm: () => Promise<void>;
  failure: RedeemFailure | null;
  result: RedeemedView | null;
  reset: () => void;
}

export function useRedeem(): RedeemApi {
  const [selected, setSelected] = useState<TierView | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [failure, setFailure] = useState<RedeemFailure | null>(null);
  const [result, setResult] = useState<RedeemedView | null>(null);
  const flight = useRef(createSingleFlight()).current;

  const confirm = useCallback(async () => {
    if (!selected) return;
    await flight(async () => {
      setSubmitting(true);
      setFailure(null);
      try {
        setResult(await redeemVoucherCall(selected.id));
      } catch (e) {
        setFailure(toRedeemFailure(e, errorMessage));
      } finally {
        setSubmitting(false);
        setConfirming(false);
      }
    });
  }, [selected, flight]);

  return {
    selected,
    select: (t) => {
      setSelected(t);
      setFailure(null);
    },
    confirming,
    openConfirm: () => selected && setConfirming(true),
    cancelConfirm: () => !submitting && setConfirming(false),
    submitting,
    confirm,
    failure,
    result,
    reset: () => {
      setResult(null);
      setFailure(null);
      setSelected(null);
    },
  };
}
