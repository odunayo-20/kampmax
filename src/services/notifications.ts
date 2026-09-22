import { apiClient } from "@/lib/api-client";
import { Notification, NotificationCategory } from "@/types";
import {
  getNotificationsByUser as _getNotificationsByUser,
  getUnreadCount as _getUnreadCount,
  pushNotificationRecord,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotificationRecord,
} from "@/data/notifications";

export async function getNotificationsApi(userId: string): Promise<Notification[]> {
  const { data, error } = await apiClient.get<Notification[]>("/notifications");
  if (!error && Array.isArray(data)) {
    return data;
  }
  return getNotifications(userId);
}

export async function markAsReadApi(notificationId: string): Promise<void> {
  await apiClient.post(`/notifications/${notificationId}/read`);
  markAsRead(notificationId);
}

const categoryLabels: Record<NotificationCategory, string> = {
  orders: "Orders",
  messages: "Messages",
  marketplace: "Marketplace",
  campus: "Campus",
  payments: "Payments",
  account: "Account",
  promotions: "Promotions",
  bookings: "Bookings",
};

export { categoryLabels };

export interface NotificationCategorySummary {
  id: NotificationCategory | "all";
  label: string;
  count: number;
  unread: number;
}

const CATEGORY_ORDER: NotificationCategory[] = [
  "orders",
  "messages",
  "marketplace",
  "bookings",
  "campus",
  "payments",
  "account",
  "promotions",
];

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

export function getNotifications(userId: string): Notification[] {
  return _getNotificationsByUser(userId);
}

export function getUnreadNotificationCount(userId: string): number {
  return _getUnreadCount(userId);
}

export function getNotificationsByCategory(
  userId: string,
  category: NotificationCategory
): Notification[] {
  return _getNotificationsByUser(userId).filter(
    (n) => n.category === category
  );
}

export function getUnreadCountByCategory(
  userId: string,
  category: NotificationCategory
): number {
  return _getNotificationsByUser(userId).filter(
    (n) => n.category === category && !n.read
  ).length;
}

export function getGroupedNotifications(
  userId: string
): { category: NotificationCategory; label: string; notifications: Notification[] }[] {
  const userNotifs = _getNotificationsByUser(userId);

  const groups: Record<string, Notification[]> = {};
  for (const notif of userNotifs) {
    if (!groups[notif.category]) groups[notif.category] = [];
    groups[notif.category].push(notif);
  }

  return CATEGORY_ORDER.filter((cat) => groups[cat]?.length).map((cat) => ({
    category: cat,
    label: categoryLabels[cat],
    notifications: groups[cat],
  }));
}

/**
 * Aggregate summary for the notification center's category tabs.
 * Driven by a single store pass so the "All" totals always equal the
 * per-category counts.
 */
export function getNotificationCategorySummaries(
  userId: string
): NotificationCategorySummary[] {
  const all = _getNotificationsByUser(userId);

  const counted = CATEGORY_ORDER.map((category) => {
    const items = all.filter((n) => n.category === category);
    return {
      id: category,
      label: categoryLabels[category],
      count: items.length,
      unread: items.filter((n) => !n.read).length,
    };
  }).filter((sum) => sum.count > 0);

  return [
    {
      id: "all" as const,
      label: "All",
      count: all.length,
      unread: all.filter((n) => !n.read).length,
    },
    ...counted,
  ];
}

export function markAsRead(notificationId: string): void {
  markNotificationRead(notificationId);
}

export function markAllAsRead(userId: string): void {
  markAllNotificationsRead(userId);
}

export function deleteNotification(notificationId: string): boolean {
  return deleteNotificationRecord(notificationId);
}