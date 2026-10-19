// In-app notification writer (ADR-016, architecture.md 2.3 Notification). Written in the same tx as the triggering change.
import { FieldValue, type Firestore, type Transaction } from 'firebase-admin/firestore';
import type { NotificationType } from '@silveracademy/shared';
import { COL } from './refs';

export interface NotifyInput {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  /** Document path the notification links to, e.g. `paths.workshop(id)`. */
  refPath?: string;
}

/** Pure: stored shape (without id / createdAt). `read` starts false. */
export const buildNotification = (input: NotifyInput) => ({
  userId: input.userId,
  type: input.type,
  title: input.title,
  body: input.body,
  ...(input.refPath ? { refPath: input.refPath } : {}),
  read: false,
});

/** `tx.create` a notification inside a transaction. Returns the id. */
export function notifyTx(db: Firestore, tx: Transaction, input: NotifyInput): string {
  const ref = db.collection(COL.notifications).doc();
  tx.create(ref, {
    id: ref.id,
    ...buildNotification(input),
    createdAt: FieldValue.serverTimestamp(),
  });
  return ref.id;
}
