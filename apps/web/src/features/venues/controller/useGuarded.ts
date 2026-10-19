// Runs a mutation and logs out when the session is gone (handoff 2.2 rule). Hooks may use React.
import { useCallback } from 'react';
import { useSession } from '../../auth';
import { isSessionError } from '../../../services/errors';

export function useGuardedAction() {
  const session = useSession();
  return useCallback(
    async <T>(
      fn: () => Promise<T>,
    ): Promise<{ ok: true; value: T } | { ok: false; error: unknown }> => {
      try {
        return { ok: true, value: await fn() };
      } catch (error) {
        if (isSessionError(error)) void session.logout();
        return { ok: false, error };
      }
    },
    [session],
  );
}
