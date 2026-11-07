// UC #0-1 fake Singpass flow hook: runs the effects of flowMachine (approval delay, then the unchanged login(profileId)).
import { useCallback, useEffect, useRef, useState } from 'react';
import type { RegisterAs } from '@silveracademy/shared';
import { APPROVAL_DELAY_MS } from '../constants';
import { createApprovalGate, type ApprovalGate } from './approvalGate';
import { deriveScreenState } from './fakeSingpassLogic';
import { INITIAL_FLOW, stepFlow, type FlowAction, type FlowState } from './flowMachine';
import type { useLoginController } from './useLoginController';

type LoginController = ReturnType<typeof useLoginController>;

export function useFakeSingpassFlow({ phase, login, reset }: LoginController) {
  const [approving, setApproving] = useState<string | null>(null);
  const flowRef = useRef<FlowState>(INITIAL_FLOW);
  const gateRef = useRef<ApprovalGate | null>(null);

  // Leaving the screen must never sign in afterwards.
  useEffect(() => () => gateRef.current?.cancel(), []);

  // Effects call back into dispatch (timer, settled), so it is reached through a ref.
  const dispatchRef = useRef<(action: FlowAction) => void>(() => undefined);
  const dispatch = useCallback(
    (action: FlowAction) => {
      const { state, effect } = stepFlow(flowRef.current, action);
      flowRef.current = state;
      setApproving(state.approving);
      const settled = (attempt: number) => () => dispatchRef.current({ type: 'settled', attempt });
      switch (effect.kind) {
        case 'startApproval': {
          const { attempt } = effect;
          const gate = createApprovalGate(APPROVAL_DELAY_MS, () =>
            dispatchRef.current({ type: 'approved', attempt }),
          );
          gateRef.current = gate;
          gate.start();
          break;
        }
        case 'login':
          void login(effect.profileId).finally(settled(effect.attempt));
          break;
        case 'register':
          void login(effect.profileId, effect.registerAs).finally(settled(effect.attempt));
          break;
        case 'cancelApproval':
          gateRef.current?.cancel();
          break;
        case 'none':
          break;
      }
    },
    [login],
  );
  dispatchRef.current = dispatch;

  /** `skipApproval` is for demo-tool simulations. Ignored while an approval or login is already running. */
  const begin = useCallback(
    (profileId: string, skipApproval = false) =>
      dispatch({ type: 'begin', profileId, skipApproval }),
    [dispatch],
  );

  /** Second call after REGISTRATION_REQUIRED: goes straight to login, the approval step is not repeated. */
  const register = useCallback(
    (profileId: string, registerAs: RegisterAs) =>
      dispatch({ type: 'register', profileId, registerAs }),
    [dispatch],
  );

  /** Cancels a pending approval or in-flight login (no sign-in follows) and clears any error or first-login prompt. */
  const cancel = useCallback(() => {
    dispatch({ type: 'cancel' });
    reset();
  }, [dispatch, reset]);

  return {
    state: deriveScreenState(phase, approving),
    begin,
    register,
    cancel,
    dismissError: reset,
  };
}
