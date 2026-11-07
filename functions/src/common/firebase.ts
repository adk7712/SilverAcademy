// Lazy firebase-admin singletons. Handlers/repos obtain Firestore/Auth here so tests can inject their own. Cross-cutting.
import { getApp, initializeApp } from 'firebase-admin/app';
import { getAuth, type Auth } from 'firebase-admin/auth';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';

/** Checks the default app specifically: in the cloud, firebase-functions registers its own named app first. */
function ensureApp(): void {
  try {
    getApp();
  } catch {
    initializeApp();
  }
}

export function getDb(): Firestore {
  ensureApp();
  return getFirestore();
}

export function getAdminAuth(): Auth {
  ensureApp();
  return getAuth();
}
