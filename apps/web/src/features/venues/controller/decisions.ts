// UC #4-2 decide a request: maps callable results/errors to UI outcomes (deps injected for tests).
import type { CallableInput, CallableOutput } from '@silveracademy/shared';
import { venueStrings } from '../strings';
import { isSlotConflict, venueErrorMessage } from './venueErrors';
import { emptyToUndefined, type RequestAction } from './requestRules';

type DecideInput = CallableInput<'venues-decideVenueRequest'>;
type DecideOutput = CallableOutput<'venues-decideVenueRequest'>;

export type DecisionOutcome =
  | { kind: 'ok'; message: string }
  | { kind: 'conflict'; message: string }
  | { kind: 'error'; message: string; error: unknown };

export interface DecisionForm {
  requestId: string;
  action: RequestAction;
  /** Reject reason (optional). */
  reason?: string;
  /** Request-info question (required for REQUEST_INFO). */
  message?: string;
  suggestedSlotId?: string;
}

export function buildDecideInput(form: DecisionForm): DecideInput {
  const input: DecideInput = { requestId: form.requestId, decision: form.action };
  const reason = emptyToUndefined(form.reason ?? '');
  const message = emptyToUndefined(form.message ?? '');
  if (form.action === 'REJECT' && reason) input.reason = reason;
  if (form.action === 'REQUEST_INFO' && message) input.message = message;
  if (form.action !== 'APPROVE' && form.suggestedSlotId)
    input.suggestedSlotId = form.suggestedSlotId;
  return input;
}

const OK_MESSAGES: Record<RequestAction, string> = {
  APPROVE: venueStrings.requests.approved,
  REJECT: venueStrings.requests.rejected,
  REQUEST_INFO: venueStrings.requests.infoSent,
};

export async function submitDecision(
  decide: (input: DecideInput) => Promise<DecideOutput>,
  form: DecisionForm,
): Promise<DecisionOutcome> {
  if (form.action === 'REQUEST_INFO' && !emptyToUndefined(form.message ?? '')) {
    return {
      kind: 'error',
      message: venueStrings.requests.infoRequired,
      error: new Error('REASON_REQUIRED'),
    };
  }
  try {
    await decide(buildDecideInput(form));
    return { kind: 'ok', message: OK_MESSAGES[form.action] };
  } catch (error) {
    if (isSlotConflict(error)) {
      return { kind: 'conflict', message: venueStrings.requests.conflictBody };
    }
    return { kind: 'error', message: venueErrorMessage(error), error };
  }
}
