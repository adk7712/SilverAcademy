// UC #1-4 #3-4 scan flow hook: debounce, QR pre-check, submit, result state, auto-reset after success.
import { useCallback, useEffect, useReducer, useRef } from 'react';
import { errorOrNull } from '../../../services/errors/errorMessage';
import { recordAttendance, setCheckInCode } from '../repo/attendanceRepo';
import type { ScanInput } from '../types';
import {
  INITIAL_GATE,
  INITIAL_SCAN_STATE,
  SUCCESS_AUTO_RESET_MS,
  acceptScan,
  invalidQrOutcome,
  isScannableQr,
  outcomeFromError,
  scanReducer,
  successOutcome,
} from './scanLogic';

export function useScanController(workshopId: string) {
  const [state, dispatch] = useReducer(scanReducer, INITIAL_SCAN_STATE);
  const gate = useRef(INITIAL_GATE);
  const busy = useRef(false); // synchronous guard: reducer state lags behind rapid camera frames

  const submit = useCallback(
    async (input: ScanInput) => {
      if (busy.current) return;
      busy.current = true;
      dispatch({ type: 'SUBMIT' });
      try {
        dispatch({
          type: 'RESULT',
          outcome: successOutcome(await recordAttendance(workshopId, input)),
        });
      } catch (e) {
        dispatch({ type: 'RESULT', outcome: outcomeFromError(e) });
      } finally {
        busy.current = false;
      }
    },
    [workshopId],
  );

  const onBarcode = useCallback(
    (raw: string) => {
      if (busy.current || state.phase !== 'scanning') return;
      const next = acceptScan(gate.current, raw, Date.now());
      if (!next) return;
      gate.current = next;
      if (!isScannableQr(raw)) {
        dispatch({ type: 'RESULT', outcome: invalidQrOutcome() });
        return;
      }
      void submit({ qrPayload: raw.trim() });
    },
    [state.phase, submit],
  );

  const reset = useCallback(() => dispatch({ type: 'RESET' }), []);

  useEffect(() => {
    if (state.phase !== 'result' || state.outcome.status !== 'success') return;
    const t = setTimeout(reset, SUCCESS_AUTO_RESET_MS);
    return () => clearTimeout(t);
  }, [state, reset]);

  return { state, onBarcode, reset };
}

/** The instructor sets the session code that learners type on their ticket to check in (ADR-030). */
export const saveSessionCode = (workshopId: string, code: string) =>
  errorOrNull(setCheckInCode(workshopId, code));
