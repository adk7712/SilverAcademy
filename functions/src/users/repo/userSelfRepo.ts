// NFR 2.1 preferences (ADR-008) and notification read marks (inferred in UC #4-2, #5-3, #5-5): self-service writes on the caller's own docs.
import { FieldValue, type Firestore } from 'firebase-admin/firestore';
import { AppError, type Notification, type User, type UserPrefs } from '@silveracademy/shared';
import { COL, runTx, type Caller } from '../../common';
import { decidePreferences, type PreferencesPatch } from '../controller/decidePreferences';

/** Merges prefs on users/{uid}. Does not bump `version` (that is for admin stale-edit detection). */
export async function updatePreferences(
  db: Firestore,
  caller: Pick<Caller, 'uid' | 'roles'>,
  patch: PreferencesPatch,
): Promise<{ prefs: UserPrefs }> {
  const ref = db.collection(COL.users).doc(caller.uid);
  return runTx(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) throw new AppError('NOT_FOUND');
    const user = snap.data() as User;
    const prefs = decidePreferences(user.prefs, user.roles, patch);
    tx.update(ref, { prefs, updatedAt: FieldValue.serverTimestamp() });
    return { prefs };
  });
}

/** Marks a notification read. Someone else's or a missing one is NOT_FOUND (no existence leak). */
export async function markNotificationRead(
  db: Firestore,
  caller: Pick<Caller, 'uid'>,
  notificationId: string,
): Promise<Record<string, never>> {
  const ref = db.collection(COL.notifications).doc(notificationId);
  await runTx(db, async (tx) => {
    const snap = await tx.get(ref);
    const n = snap.exists ? (snap.data() as Notification) : undefined;
    if (!n || n.userId !== caller.uid) throw new AppError('NOT_FOUND');
    if (!n.read) tx.update(ref, { read: true });
  });
  return {};
}
