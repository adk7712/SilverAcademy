// UC #0-2 session expiry: logs out when a call fails with UNAUTHENTICATED / ACCOUNT_SUSPENDED (handoff 2.2 rule).
import { useCallback } from 'react';
import { isSessionError } from '../../../services/errors';
import { useSession } from './SessionProvider';

/** Returns a stable-per-session handler: pass any caught error; logs out if the session is gone. */
export function useSessionGuard(): (error: unknown) => void {
  const { logout } = useSession();
  return useCallback(
    (error: unknown) => {
      if (isSessionError(error)) void logout();
    },
    [logout],
  );
}
