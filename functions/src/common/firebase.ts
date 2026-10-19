// Lazy firebase-admin singletons. Handlers/repos obtain Firestore/Auth here so tests can inject their own. Cross-cutting.
import { getApps, initializeApp } from 'firebase-admin/app';
import { getAuth, type Auth } from 'firebase-admin/auth';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';

function ensureApp(): void {
  if (getApps().length === 0) initializeApp();
}

export function getDb(): Firestore {
  ensureApp();
  return getFirestore();
}

export function getAdminAuth(): Auth {
  ensureApp();
  return getAuth();
}
