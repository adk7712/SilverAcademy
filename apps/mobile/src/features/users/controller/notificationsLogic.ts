// Profile notifications: pure helpers (unread count, optimistic mark-read).
import type { NotificationView } from '../profileTypes';

export const NOTIFICATIONS_LIMIT = 20;

export const unreadCount = (items: readonly NotificationView[]): number =>
  items.filter((n) => !n.read).length;

export const markReadLocally = (
  items: readonly NotificationView[],
  id: string,
): NotificationView[] => items.map((n) => (n.id === id ? { ...n, read: true } : n));

/** Unread first, then newest first. */
export function sortNotifications(items: readonly NotificationView[]): NotificationView[] {
  const ms = (n: NotificationView) => n.createdAt?.getTime() ?? 0;
  return [...items].sort((a, b) => Number(a.read) - Number(b.read) || ms(b) - ms(a));
}
