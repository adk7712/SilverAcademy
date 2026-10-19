// UC #0-1 Login with Singpass controller: authenticate -> exchange -> sign in; handles first-login registration and failures.
import { useCallback, useState } from 'react';
import { AppError, type RegisterAs } from '@silveracademy/shared';
import { createAuthProvider } from '../../../services/auth/createAuthProvider';
import { toAppError } from '../../../services/errors/toAppError';
import { exchangeSingpass, signInWithToken } from '../repo/authRepo';
import type { LoginPhase } from './loginLogic';

export function useLoginController() {
  const [phase, setPhase] = useState<LoginPhase>({ kind: 'idle' });

  /** `registerAs` is only sent on the second call after REGISTRATION_REQUIRED. */
  const login = useCallback(async (profileId: string, registerAs?: RegisterAs) => {
    setPhase({ kind: 'loading' });
    try {
      const provider = createAuthProvider(profileId);
      if (!(await provider.isAvailable())) throw new AppError('SINGPASS_UNAVAILABLE');
      const { assertion, nonce } = await provider.authenticate();
      const result = await exchangeSingpass({ assertion, nonce, registerAs });
      await signInWithToken(result.customToken);
      setPhase({ kind: 'idle' }); // SessionProvider reacts to the new auth user
    } catch (e) {
      const error = toAppError(e);
      setPhase(
        error.code === 'REGISTRATION_REQUIRED'
          ? { kind: 'register', profileId }
          : { kind: 'error', error },
      );
    }
  }, []);

  const reset = useCallback(() => setPhase({ kind: 'idle' }), []);

  return { phase, login, reset };
}
