// UC #0-1 pure state rules of the fake Singpass flow: busy guard, approval, cancel, register. The hook only runs the effects.
import type { RegisterAs } from '@silveracademy/shared';

export interface FlowState {
  /** An approval wait or a login call is running: further begin/register taps are ignored. */
  busy: boolean;
  /** Profile waiting for the fake approval, or null. */
  approving: string | null;
  /** Counts attempts so a late result of a cancelled attempt cannot clear the busy flag of a newer one. */
  attempt: number;
}

export const INITIAL_FLOW: FlowState = { busy: false, approving: null, attempt: 0 };

export type FlowAction =
  | { type: 'begin'; profileId: string; skipApproval: boolean }
  | { type: 'approved'; attempt: number }
  | { type: 'settled'; attempt: number }
  | { type: 'register'; profileId: string; registerAs: RegisterAs }
  | { type: 'cancel' };

export type FlowEffect =
  | { kind: 'none' }
  | { kind: 'startApproval'; attempt: number }
  | { kind: 'login'; profileId: string; attempt: number }
  | { kind: 'register'; profileId: string; registerAs: RegisterAs; attempt: number }
  | { kind: 'cancelApproval' };

const NONE: FlowEffect = { kind: 'none' };

/** Pure transition: next state plus the one side effect the hook must run. */
export function stepFlow(
  state: FlowState,
  action: FlowAction,
): { state: FlowState; effect: FlowEffect } {
  switch (action.type) {
    case 'begin': {
      if (state.busy) return { state, effect: NONE };
      const attempt = state.attempt + 1;
      if (action.skipApproval) {
        return {
          state: { busy: true, approving: null, attempt },
          effect: { kind: 'login', profileId: action.profileId, attempt },
        };
      }
      return {
        state: { busy: true, approving: action.profileId, attempt },
        effect: { kind: 'startApproval', attempt },
      };
    }
    case 'approved': {
      if (action.attempt !== state.attempt || state.approving === null) {
        return { state, effect: NONE };
      }
      return {
        state: { ...state, approving: null },
        effect: { kind: 'login', profileId: state.approving, attempt: state.attempt },
      };
    }
    case 'register': {
      if (state.busy) return { state, effect: NONE };
      const attempt = state.attempt + 1;
      return {
        state: { busy: true, approving: null, attempt },
        effect: {
          kind: 'register',
          profileId: action.profileId,
          registerAs: action.registerAs,
          attempt,
        },
      };
    }
    case 'settled':
      if (action.attempt !== state.attempt) return { state, effect: NONE };
      return { state: { ...state, busy: false }, effect: NONE };
    case 'cancel':
      // Also frees a login already in flight: the hook invalidates it, so its result is ignored.
      return {
        state: { ...state, busy: false, approving: null },
        effect: state.approving !== null ? { kind: 'cancelApproval' } : NONE,
      };
  }
}
