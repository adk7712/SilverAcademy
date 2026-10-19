// UC #2-4 profile extras: notification view model.
export interface NotificationView {
  id: string;
  title: string;
  body: string;
  read: boolean;
  createdAt: Date | null;
}
