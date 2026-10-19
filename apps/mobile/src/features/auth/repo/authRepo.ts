// UC #0-1 auth data access: Firebase Auth session, user doc read, auth callables. No business rules.
import { onAuthStateChanged, signInWithCustomToken, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import type { CallableInput, CallableOutput } from '@silveracademy/shared';
import { firebaseAuth, firestore } from '../../../services/firebase';
import { callFunction } from '../../../services/callables';
import type { UserSummary } from '../types';

export function watchAuthUser(onChange: (user: { uid: string } | null) => void): () => void {
  return onAuthStateChanged(firebaseAuth, (user) => onChange(user ? { uid: user.uid } : null));
}

/** Custom claims of the current user's ID token; `forceRefresh` fetches a new token from the server. */
export async function loadClaims(forceRefresh: boolean): Promise<Record<string, unknown> | null> {
  const user = firebaseAuth.currentUser;
  if (!user) return null;
  const result = await user.getIdTokenResult(forceRefresh);
  return result.claims;
}

/** Own users/{uid} doc (rules allow it). Returns null on any failure; the shell works from claims alone. */
export async function loadUserSummary(uid: string): Promise<UserSummary | null> {
  try {
    const snap = await getDoc(doc(firestore, 'users', uid));
    const data = snap.data();
    if (!data) return null;
    const prefs = (data.prefs ?? {}) as { lastMode?: unknown };
    return { displayName: String(data.displayName ?? ''), lastMode: prefs.lastMode };
  } catch {
    return null;
  }
}

export const exchangeSingpass = (input: CallableInput<'auth-exchangeSingpass'>) =>
  callFunction('auth-exchangeSingpass', input);

export type ExchangeResult = CallableOutput<'auth-exchangeSingpass'>;

export async function signInWithToken(customToken: string): Promise<void> {
  await signInWithCustomToken(firebaseAuth, customToken);
}

export const signOutUser = () => signOut(firebaseAuth);

/** Best-effort mirror of the UI mode to prefs.lastMode (ADR-008). Failures are ignored. */
export async function syncLastMode(mode: CallableInput<'users-updatePreferences'>['lastMode']) {
  try {
    await callFunction('users-updatePreferences', { lastMode: mode });
  } catch {
    // Local persistence is the source of truth for the UI; the server copy is a convenience.
  }
}
