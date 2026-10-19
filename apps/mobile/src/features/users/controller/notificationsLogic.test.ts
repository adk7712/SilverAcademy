// Tests for notification list helpers.
import { markReadLocally, sortNotifications, unreadCount } from './notificationsLogic';

const n = (id: string, read: boolean, day: number) => ({
  id,
  title: id,
  body: '',
  read,
  createdAt: new Date(Date.UTC(2026, 9, day)),
});

describe('notifications logic', () => {
  const items = [n('a', true, 3), n('b', false, 1), n('c', false, 2)];
  it('counts unread', () => expect(unreadCount(items)).toBe(2));
  it('marks one read without mutating', () => {
    const next = markReadLocally(items, 'b');
    expect(next.find((x) => x.id === 'b')?.read).toBe(true);
    expect(items.find((x) => x.id === 'b')?.read).toBe(false);
  });
  it('sorts unread first then newest first', () => {
    expect(sortNotifications(items).map((x) => x.id)).toEqual(['c', 'b', 'a']);
  });
});
