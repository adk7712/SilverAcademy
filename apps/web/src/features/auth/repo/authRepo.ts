// Firebase Auth access for the staff session (no business rules). UC #0-2.
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import type { StaffLoginOutcome } from '@silveracademy/shared';
import { callFunction, firebaseAuth } from '../../../services';
import { parseClaims } from '../controller/guards';
import type { SessionClaims } from '../types';

export interface AuthSnapshot {
  uid: string;
  email: string | null;
  claims: SessionClaims;
}

export async function signInWithPassword(email: string, password: string): Promise<void> {
  await signInWithEmailAndPassword(firebaseAuth, email, password);
}

export const signOutStaff = (): Promise<void> => signOut(firebaseAuth);

/** `forceRefresh` = getIdToken(true): needed once after recordStaffLogin SUCCESS sets claims. */
export async function readSnapshot(forceRefresh: boolean): Promise<AuthSnapshot | null> {
  const user = firebaseAuth.currentUser;
  if (!user) return null;
  const token = await user.getIdTokenResult(forceRefresh);
  return { uid: user.uid, email: user.email, claims: parseClaims(token.claims) };
}

export async function recordStaffLogin(userId: string, outcome: StaffLoginOutcome): Promise<void> {
  await callFunction('auth-recordStaffLogin', { userId, outcome });
}

/** Subscribes to sign-in state; returns the unsubscribe function. */
export const onAuthChange = (cb: (signedIn: boolean) => void): (() => void) =>
  onAuthStateChanged(firebaseAuth, (u) => cb(u !== null));
