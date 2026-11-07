// UC #0-1 Login with Singpass controller: authenticate -> exchange -> sign in; handles first-login registration and failures.
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppError, type RegisterAs } from '@silveracademy/shared';
import { createAuthProvider } from '../../../services/auth/createAuthProvider';
import { toAppError } from '../../../services/errors/toAppError';
import { SESSION_HYDRATE_FALLBACK_MS } from '../constants';
import { exchangeSingpass, signInWithToken, signOutUser } from '../repo/authRepo';
import { createLoginGeneration } from './loginGeneration';
import { decideHydrateFallback, type LoginPhase } from './loginLogic';

export function useLoginController() {
  const [phase, setPhase] = useState<LoginPhase>({ kind: 'idle' });
  const generation = useRef(createLoginGeneration()).current;
  const fallbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearFallback = useCallback(() => {
    if (fallbackTimer.current !== null) clearTimeout(fallbackTimer.current);
    fallbackTimer.current = null;
  }, []);

  // Unmount: no attempt may touch state or sign in afterwards.
  useEffect(
    () => () => {
      generation.invalidate();
      clearFallback();
    },
    [generation, clearFallback],
  );

  /** `registerAs` is only sent on the second call after REGISTRATION_REQUIRED. A reset during the call makes it stale: nothing is signed in or shown. */
  const login = useCallback(
    async (profileId: string, registerAs?: RegisterAs) => {
      const ticket = generation.begin();
      clearFallback();
      setPhase({ kind: 'loading', stage: 'exchange' });
      try {
        const provider = createAuthProvider(profileId);
        if (!(await provider.isAvailable())) throw new AppError('SINGPASS_UNAVAILABLE');
        const { assertion, nonce } = await provider.authenticate();
        if (!generation.isCurrent(ticket)) return; // left before anything was sent
        const result = await exchangeSingpass({ assertion, nonce, registerAs });
        if (!generation.isCurrent(ticket)) return; // left during the server call: do not sign in
        setPhase({ kind: 'loading', stage: 'session' }); // from here Back is hidden: the sign-in is under way
        await signInWithToken(result.customToken);
        if (!generation.isCurrent(ticket)) return; // reset/unmount during sign-in: start no timer
        // Stay on "Logging in" until SessionProvider swaps this screen out. If hydration never does, sign out
        // (so retrying the same account re-hydrates) and show an error instead of leaving Firebase signed in.
        fallbackTimer.current = setTimeout(() => {
          if (decideHydrateFallback(generation.isCurrent(ticket)) === 'ignore') return;
          void signOutUser()
            .catch(() => undefined)
            .then(() => {
              if (generation.isCurrent(ticket)) {
                setPhase({ kind: 'error', error: new AppError('INTERNAL') });
              }
            });
        }, SESSION_HYDRATE_FALLBACK_MS);
      } catch (e) {
        if (!generation.isCurrent(ticket)) return;
        const error = toAppError(e);
        setPhase(
          error.code === 'REGISTRATION_REQUIRED'
            ? { kind: 'register', profileId }
            : { kind: 'error', error },
        );
      }
    },
    [generation, clearFallback],
  );

  /** Back to idle and invalidates any attempt still in flight. */
  const reset = useCallback(() => {
    generation.invalidate();
    clearFallback();
    setPhase({ kind: 'idle' });
  }, [generation, clearFallback]);

  return { phase, login, reset };
}
