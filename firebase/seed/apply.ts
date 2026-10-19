// Writes a seed plan to the Auth and Firestore emulators (task 0.5). Full-doc set() and fixed ids make reruns idempotent.
import type { Auth } from 'firebase-admin/auth';
import type { DocumentData, Firestore } from 'firebase-admin/firestore';
import type { AuthUserSpec, SeedDoc } from './types';

const MAX_BATCH_WRITES = 500;
const AUTH_USER_NOT_FOUND = 'auth/user-not-found';

interface AuthProps {
  displayName: string;
  disabled: boolean;
  email?: string;
  emailVerified?: boolean;
  password?: string;
}

const errorCode = (err: unknown): string =>
  typeof err === 'object' && err !== null && 'code' in err ? String(err.code) : '';

async function upsertAuthUser(auth: Auth, spec: AuthUserSpec): Promise<void> {
  const props: AuthProps = {
    displayName: spec.displayName,
    disabled: false,
    ...(spec.email ? { email: spec.email, emailVerified: true } : {}),
    ...(spec.password ? { password: spec.password } : {}),
  };
  try {
    await auth.updateUser(spec.uid, props);
  } catch (err) {
    if (errorCode(err) !== AUTH_USER_NOT_FOUND) throw err;
    await auth.createUser({ uid: spec.uid, ...props });
  }
  await auth.setCustomUserClaims(spec.uid, { roles: spec.roles, status: 'ACTIVE' });
}

export async function applyAuthUsers(auth: Auth, users: AuthUserSpec[]): Promise<void> {
  for (const user of users) {
    await upsertAuthUser(auth, user);
  }
}

export async function applyDocs(db: Firestore, docs: SeedDoc[]): Promise<void> {
  for (let start = 0; start < docs.length; start += MAX_BATCH_WRITES) {
    const batch = db.batch();
    for (const doc of docs.slice(start, start + MAX_BATCH_WRITES)) {
      batch.set(db.doc(doc.path), doc.data as DocumentData);
    }
    await batch.commit();
  }
}

/** Doc counts per collection name, for the run summary. */
export function countByCollection(docs: SeedDoc[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const doc of docs) {
    const segments = doc.path.split('/');
    const collection = segments[segments.length - 2] ?? doc.path;
    counts.set(collection, (counts.get(collection) ?? 0) + 1);
  }
  return counts;
}
