// Typed callable helper: feature repos call `callFunction('bookings-bookWorkshop', input)` (architecture.md 1.3, 6).
import { httpsCallable } from 'firebase/functions';
import type { CallableInput, CallableName, CallableOutput } from '@silveracademy/shared';
import { functionsClient } from './firebase';
import { toAppError } from './errors/toAppError';
import { stripUndefined } from './stripUndefined';

/**
 * Invokes a deployed callable. Input and output types come from `CALLABLES` in @silveracademy/shared.
 * Every failure is converted to an `AppError`; show it with `errorMessage(error)`.
 */
export async function callFunction<N extends CallableName>(
  name: N,
  input: CallableInput<N>,
): Promise<CallableOutput<N>> {
  try {
    const callable = httpsCallable<CallableInput<N>, CallableOutput<N>>(functionsClient, name);
    const result = await callable(stripUndefined(input));
    return result.data;
  } catch (e) {
    throw toAppError(e);
  }
}
