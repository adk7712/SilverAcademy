// Creates a staff account (UC #5-1 onboarding, gap 17): Auth user `st_<userId>` + claims + users doc + audit. Admin SDK only.
import type { Auth } from 'firebase-admin/auth';
import { FieldValue, type Firestore } from 'firebase-admin/firestore';
import { AppError, FONT_SCALES, type StaffRole, type User } from '@silveracademy/shared';
import { COL, runTx, writeAuditTx, type Caller } from '../../common';
import {
  decideStaffAccountCreate,
  staffEmail,
  staffRolesFor,
  staffUid,
} from '../controller/staffAccount';

const DEFAULT_FONT_SCALE = FONT_SCALES[0];

export interface CreateStaffInput {
  userId: string;
  displayName: string;
  role: StaffRole;
  orgName?: string | undefined;
  initialPassword: string;
}

const errorCode = (e: unknown): string =>
  typeof e === 'object' && e !== null && 'code' in e ? String((e as { code: unknown }).code) : '';
const TAKEN_CODES = ['auth/uid-already-exists', 'auth/email-already-exists'];

/**
 * Order: pre-check users doc, create Auth user (duplicate uid/email -> USER_ID_TAKEN), set claims, then one
 * transaction creating the users doc + audit (tx.create also guards a racing duplicate). Any failure after the
 * Auth user exists deletes it again so no half-created account remains. The password is never stored or audited.
 */
export async function createStaffAccount(
  db: Firestore,
  auth: Auth,
  caller: Pick<Caller, 'uid'>,
  input: CreateStaffInput,
): Promise<{ uid: string }> {
  const uid = staffUid(input.userId);
  const ref = db.collection(COL.users).doc(uid);
  const pre = await ref.get();
  decideStaffAccountCreate(pre.exists ? (pre.data() as User) : undefined);

  try {
    await auth.createUser({
      uid,
      email: staffEmail(input.userId),
      emailVerified: true,
      password: input.initialPassword,
      displayName: input.displayName,
    });
  } catch (e) {
    if (TAKEN_CODES.includes(errorCode(e))) throw new AppError('USER_ID_TAKEN');
    throw e;
  }

  try {
    const roles = staffRolesFor(input.role);
    await auth.setCustomUserClaims(uid, { roles, status: 'ACTIVE' });
    await runTx(db, async (tx) => {
      const snap = await tx.get(ref);
      decideStaffAccountCreate(snap.exists ? (snap.data() as User) : undefined);
      tx.create(ref, {
        uid,
        authType: 'STAFF',
        displayName: input.displayName,
        displayNameLower: input.displayName.toLowerCase(),
        roles,
        status: 'ACTIVE',
        flagged: false,
        seniorEligible: false,
        staffUserId: input.userId,
        ...(input.role === 'COMMUNITY_PARTNER' && input.orgName ? { orgName: input.orgName } : {}),
        prefs: { fontScale: DEFAULT_FONT_SCALE },
        version: 1,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
      writeAuditTx(db, tx, {
        actorId: caller.uid,
        actorRole: 'ADMIN',
        action: 'STAFF_ACCOUNT_CREATE',
        outcome: 'SUCCESS',
        targetType: 'USER',
        targetId: uid,
        details: { userId: input.userId, role: input.role },
      });
    });
  } catch (e) {
    await auth.deleteUser(uid).catch(() => undefined);
    throw e;
  }
  return { uid };
}
