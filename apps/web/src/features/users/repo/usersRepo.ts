// UC #5-1 ManageAccounts: direct admin reads of users/instructorProfiles; writes only via callables.
import { collection, doc, getDoc, getDocs, limit, orderBy, query, where } from 'firebase/firestore';
import type {
  AccountAction,
  InstructorProfile,
  InstructorReviewDecision,
  User,
} from '@silveracademy/shared';
import { callFunction, firestore } from '../../../services';

export const ACCOUNT_LIST_LIMIT = 200;
/** Highest code point, closes the displayNameLower prefix range (functions.md section 2). */
const PREFIX_END = '';

export async function searchUsers(nameQuery: string): Promise<User[]> {
  const q = nameQuery.trim().toLowerCase();
  const base = collection(firestore, 'users');
  const constraints = q
    ? [where('displayNameLower', '>=', q), where('displayNameLower', '<=', q + PREFIX_END)]
    : [];
  const snap = await getDocs(
    query(base, ...constraints, orderBy('displayNameLower'), limit(ACCOUNT_LIST_LIMIT)),
  );
  return snap.docs.map((d) => ({ ...(d.data() as User), uid: d.id }));
}

export async function getUser(uid: string): Promise<User | null> {
  const snap = await getDoc(doc(firestore, 'users', uid));
  return snap.exists() ? { ...(snap.data() as User), uid: snap.id } : null;
}

export async function getInstructorProfile(uid: string): Promise<InstructorProfile | null> {
  const snap = await getDoc(doc(firestore, 'instructorProfiles', uid));
  return snap.exists() ? { ...(snap.data() as InstructorProfile), uid: snap.id } : null;
}

export async function listPendingProfiles(): Promise<InstructorProfile[]> {
  const snap = await getDocs(
    query(
      collection(firestore, 'instructorProfiles'),
      where('status', '==', 'PENDING'),
      limit(ACCOUNT_LIST_LIMIT),
    ),
  );
  return snap.docs.map((d) => ({ ...(d.data() as InstructorProfile), uid: d.id }));
}

export const setAccountStatus = (
  uid: string,
  action: AccountAction,
  expectedVersion: number,
  reason?: string,
) =>
  callFunction('users-setAccountStatus', {
    uid,
    action,
    expectedVersion,
    ...(reason ? { reason } : {}),
  });

export const reviewProfile = (
  uid: string,
  decision: InstructorReviewDecision,
  expectedVersion: number,
  reason?: string,
) =>
  callFunction('users-reviewInstructorProfile', {
    uid,
    decision,
    expectedVersion,
    ...(reason ? { reason } : {}),
  });
