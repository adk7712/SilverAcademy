// Profile notifications controller: load own notifications, mark one read (optimistic, reverted on failure).
import { useCallback, useEffect, useState } from 'react';
import { strings } from '../../../i18n';
import { errorMessage } from '../../../services/errors/errorMessage';
import { useSession } from '../../auth';
import type { NotificationView } from '../profileTypes';
import { listNotifications, markNotificationRead } from '../repo/notificationsRepo';
import { markReadLocally, NOTIFICATIONS_LIMIT, sortNotifications } from './notificationsLogic';

export function useNotifications() {
  const { state } = useSession();
  const uid = state.status === 'signedIn' ? state.uid : null;
  const [items, setItems] = useState<NotificationView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!uid) return;
    setLoading(true);
    try {
      setItems(sortNotifications(await listNotifications(uid, NOTIFICATIONS_LIMIT)));
      setError(null);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [uid]);

  useEffect(() => {
    void load();
  }, [load]);

  const markRead = async (id: string) => {
    const before = items;
    setItems(markReadLocally(items, id));
    try {
      await markNotificationRead(id);
    } catch (e) {
      setItems(before);
      setError(`${strings.usersProfile.markReadFailed} ${errorMessage(e)}`);
    }
  };

  return { items, loading, error, markRead, reload: load };
}
