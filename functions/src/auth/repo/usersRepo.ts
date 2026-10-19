// users/{uid} access for login flows. UC #0-1, #0-2. Admin SDK only; business rules live in ../controller.
import { FieldValue, Timestamp, type Firestore } from 'firebase-admin/firestore';
import type { RegisterAs, SingpassIdentity, User } from '@silveracademy/shared';
import { COL, runTx } from '../../common';
import { decideSingpassLogin, type SingpassLoginDecision } from '../controller/singpassLogin';

export interface LoginResult extends SingpassLoginDecision {
  displayName: string;
}

/**
 * Creates or refreshes users/{uid} in one transaction. Reads first, then `decideSingpassLogin`, then writes.
 * New users get `ACTIVE`, default prefs, version 1. Existing users keep name/prefs/status; roles, seniorEligible
 * and ageVerifiedAt are refreshed; `version` is NOT bumped (it guards admin edits only, review L1).
 */
export function loginTransaction(
  db: Firestore,
  args: { uid: string; identity: SingpassIdentity; registerAs: RegisterAs | undefined; now: Date },
): Promise<LoginResult> {
  const ref = db.collection(COL.users).doc(args.uid);
  return runTx(db, async (tx) => {
    const snap = await tx.get(ref);
    const existing = snap.exists ? (snap.data() as User) : undefined;
    const decision = decideSingpassLogin({
      identity: args.identity,
      existing,
      registerAs: args.registerAs,
      now: args.now,
    });
    const ageVerifiedAt = Timestamp.fromDate(args.now);
    if (!existing) {
      tx.create(ref, {
        uid: args.uid,
        authType: 'SINGPASS',
        displayName: args.identity.name,
        displayNameLower: args.identity.name.toLowerCase(),
        roles: decision.roles,
        status: 'ACTIVE',
        flagged: false,
        seniorEligible: decision.seniorEligible,
        ageVerifiedAt,
        prefs: { fontScale: 1 },
        version: 1,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
      return { ...decision, displayName: args.identity.name };
    }
    tx.update(ref, {
      roles: decision.roles,
      seniorEligible: decision.seniorEligible,
      ageVerifiedAt,
      updatedAt: FieldValue.serverTimestamp(),
    });
    return { ...decision, displayName: existing.displayName };
  });
}

/** Staff account by its login id (ids are stored lowercase, review L2); undefined when none. */
export async function findStaffByUserId(db: Firestore, userId: string): Promise<User | undefined> {
  const snap = await db.collection(COL.users).where('staffUserId', '==', userId).limit(1).get();
  return snap.empty ? undefined : (snap.docs[0]!.data() as User);
}

/** Loads a user doc (outside a transaction). */
export async function getUser(db: Firestore, uid: string): Promise<User | undefined> {
  const snap = await db.collection(COL.users).doc(uid).get();
  return snap.exists ? (snap.data() as User) : undefined;
}
