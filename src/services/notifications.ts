
import { Notification, NotificationCategory } from "@/types";
import { pushNotificationRecord } from "@/data/notifications";

const categoryLabels: Record<NotificationCategory, string> = {
  orders: "Orders",
  messages: "Messages",
  marketplace: "Marketplace",
  campus: "Campus",
  payments: "Payments",
  account: "Account",
  promotions: "Promotions",
  bookings: "Bookings",
  events: "Events",
};

export { categoryLabels };

export interface NotificationCategorySummary {
  id: NotificationCategory | "all";
  label: string;
  count: number;
  unread: number;
}

/**
 * Push a notification for a user (unshift + unread). Used by booking,
 * employer, freelancer and opportunity services to emit notifications.
 * Mirrors a backend push so the notification feed, badge and category
 * tabs all react immediately through the TanStack change bridge.
 */
export function pushUserNotification(input: {
  userId: string;
  type: Notification["type"];
  category: Notification["category"];
  title: string;
  message: string;
  actionUrl?: string;
  groupId?: string;
  imageUrl?: string;
}): Notification {
  return pushNotificationRecord(input);
}