// UC #0-1 / FR 1.3 session context: auth state, claims (roles/status), persisted UI mode, refresh, logout.
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
import { loadSession } from './loadSession';
import { availableModes, canToggleMode } from './sessionLogic';
import { saveStoredMode } from '../repo/modeRepo';
import { signOutUser, syncLastMode, watchAuthUser } from '../repo/authRepo';
import type { SessionApi, SessionState, ShellMode } from '../types';

const SessionContext = createContext<SessionApi | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SessionState>({ status: 'loading' });
  const stateRef = useRef(state);
  stateRef.current = state;
  const uidRef = useRef<string | null>(null);
  const generation = useRef(0);

  const hydrate = useCallback(async (uid: string, forceRefresh: boolean) => {
    const ticket = ++generation.current;
    try {
      const next = await loadSession(uid, forceRefresh);
      if (ticket === generation.current) setState(next);
    } catch {
      // Unexpected failure: stay on the current state rather than hanging an unhandled rejection.
      if (ticket === generation.current) {
        setState((cur) => (cur.status === 'loading' ? { status: 'signedOut' } : cur));
      }
    }
  }, []);

  useEffect(
    () =>
      watchAuthUser((user) => {
        uidRef.current = user?.uid ?? null;
        if (!user) {
          generation.current += 1;
          setState({ status: 'signedOut' });
          return;
        }
        void hydrate(user.uid, false);
      }),
    [hydrate],
  );

  const refresh = useCallback(async () => {
    if (uidRef.current) await hydrate(uidRef.current, true);
  }, [hydrate]);

  const setMode = useCallback((mode: ShellMode) => {
    const current = stateRef.current;
    if (current.status !== 'signedIn' || !availableModes(current.roles).includes(mode)) return;
    void saveStoredMode(current.uid, mode);
    void syncLastMode(mode);
    setState({ ...current, mode });
  }, []);

  const signOut = useCallback(async () => {
    await signOutUser();
  }, []);

  const api = useMemo<SessionApi>(() => {
    const roles = state.status === 'signedIn' ? state.roles : [];
    return {
      state,
      modes: availableModes(roles),
      canToggleMode: canToggleMode(roles),
      setMode,
      refresh,
      signOut,
    };
  }, [state, setMode, refresh, signOut]);

  return <SessionContext.Provider value={api}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionApi {
  const api = useContext(SessionContext);
  if (!api) throw new Error('useSession must be used inside SessionProvider');
  return api;
}
