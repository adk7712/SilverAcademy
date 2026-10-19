// Profile notifications data access: own notifications (direct read) + users-markNotificationRead callable.
import { collection, getDocs, limit, orderBy, query, where } from 'firebase/firestore';
import { callFunction } from '../../../services/callables';
import { firestore } from '../../../services/firebase';
import type { NotificationView } from '../profileTypes';

export async function listNotifications(uid: string, max: number): Promise<NotificationView[]> {
  const snap = await getDocs(
    query(
      collection(firestore, 'notifications'),
      where('userId', '==', uid),
      orderBy('createdAt', 'desc'),
      limit(max),
    ),
  );
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      title: data.title ?? '',
      body: data.body ?? '',
      read: Boolean(data.read),
      createdAt: data.createdAt?.toDate?.() ?? null,
    };
  });
}

export const markNotificationRead = (notificationId: string) =>
  callFunction('users-markNotificationRead', { notificationId });
