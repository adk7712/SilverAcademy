// Session context: role claims, login, logout (UC #0-2). Hooks may use React; Firebase stays in repo/.
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { ReactNode } from 'react';
import type { LoginResult, SessionApi, SessionState } from '../types';
import { toSessionUser } from './guards';
import { performStaffLogin } from './staffLogin';
import * as repo from '../repo/authRepo';

const SessionContext = createContext<SessionApi | null>(null);

const loginDeps = {
  signIn: repo.signInWithPassword,
  signOut: repo.signOutStaff,
  recordLogin: repo.recordStaffLogin,
  refreshClaims: () => repo.readSnapshot(true),
};

export function SessionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SessionState>({ status: 'loading' });
  // While login() runs, claims are not final yet; ignore intermediate auth-state events.
  const loginInFlight = useRef(false);

  useEffect(
    () =>
      repo.onAuthChange((signedIn) => {
        if (loginInFlight.current) return;
        if (!signedIn) return setState({ status: 'signedOut' });
        void repo
          .readSnapshot(false)
          .then((snap) => {
            const user = snap && toSessionUser(snap.uid, snap.email, snap.claims);
            setState(user ? { status: 'signedIn', user } : { status: 'signedOut' });
          })
          .catch(() => setState({ status: 'signedOut' }));
      }),
    [],
  );

  const login = useCallback(async (userId: string, password: string): Promise<LoginResult> => {
    loginInFlight.current = true;
    try {
      const result = await performStaffLogin(loginDeps, userId, password);
      setState(
        result.kind === 'success'
          ? { status: 'signedIn', user: result.user }
          : { status: 'signedOut' },
      );
      return result;
    } finally {
      loginInFlight.current = false;
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await repo.signOutStaff();
    } finally {
      setState({ status: 'signedOut' });
    }
  }, []);

  const value = useMemo(() => ({ state, login, logout }), [state, login, logout]);
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionApi {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used inside <SessionProvider>');
  return ctx;
}
