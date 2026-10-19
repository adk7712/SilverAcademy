// Token refresh: when the app returns to the foreground, re-read claims so role/status changes apply (architecture 3.2).
import { useEffect } from 'react';
import { AppState } from 'react-native';
import { useSession } from '../features/auth';

export function ForegroundRefresh() {
  const { refresh, state } = useSession();
  const signedIn = state.status === 'signedIn';
  useEffect(() => {
    if (!signedIn) return;
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'active') void refresh();
    });
    return () => sub.remove();
  }, [signedIn, refresh]);
  return null;
}
