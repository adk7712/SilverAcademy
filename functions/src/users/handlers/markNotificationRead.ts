// Notification (inferred) in UC #4-2, #5-3, #5-5: users-markNotificationRead marks one of the caller's own notifications read (ADR-016).
import { defineCallable } from '../../common';
import { markNotificationRead } from '../repo/userSelfRepo';

export const markNotificationReadCallable = defineCallable(
  'users-markNotificationRead',
  {},
  async ({ input, caller, db }) => markNotificationRead(db, caller, input.notificationId),
);
