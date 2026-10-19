// Typed callable helper: callFunction('users-setAccountStatus', input) -> output, errors as AppError.
import { httpsCallable } from 'firebase/functions';
import type { CallableInput, CallableName, CallableOutput } from '@silveracademy/shared';
import { functions } from './firebase';
import { toAppError } from './errors';

export async function callFunction<N extends CallableName>(
  name: N,
  input: CallableInput<N>,
): Promise<CallableOutput<N>> {
  try {
    const result = await httpsCallable<CallableInput<N>, CallableOutput<N>>(functions, name)(input);
    return result.data;
  } catch (e) {
    throw toAppError(e);
  }
}
