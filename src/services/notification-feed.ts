import { apiClient, type ApiError } from "@/lib/api-client";
import type { Notification, NotificationCategory, NotificationType } from "@/types";
import { categoryLabels, type NotificationCategorySummary } from "@/services/notifications";

// The signed-in user's notifications, straight from the backend. Nothing here
// falls back to bundled data: a failure throws so the page can say so.

export interface BackendNotificationItem {
  id: string;
  type: string;
  title: string;
  body: string;
  data: Record<string, unknown> | null;
  readAt: string | null;
  createdAt: string;
}

interface FeedResponse {
  items: BackendNotificationItem[];
  meta: { total: number; unreadCount: number };
}

export interface NotificationFeed {
  items: Notification[];
  /** Unread across everything the user has, not just the loaded page. */
  unreadCount: number;
  total: number;
}

const FEED_LIMIT = 100;

const KIND: Record<string, { type: NotificationType; category: NotificationCategory }> = {
  ORDER: { type: "order_update", category: "orders" },
  PAYMENT: { type: "payments", category: "payments" },
  LOYALTY: { type: "promotion", category: "promotions" },
  MESSAGE: { type: "message", category: "messages" },
  FOLLOW: { type: "campus", category: "campus" },
  LIKE: { type: "campus", category: "campus" },
  COMMENT: { type: "campus", category: "campus" },
  VENDOR: { type: "marketplace", category: "marketplace" },
  REVIEW: { type: "marketplace", category: "marketplace" },
  JOB: { type: "marketplace", category: "marketplace" },
  PROPOSAL: { type: "marketplace", category: "marketplace" },
  ENGAGEMENT: { type: "booking_update", category: "bookings" },
  EVENT: { type: "event", category: "events" },
  VERIFICATION: { type: "account", category: "account" },
  PROFILE: { type: "account", category: "account" },
  ADMIN: { type: "system", category: "account" },
  SYSTEM: { type: "system", category: "account" },
};

const FALLBACK = { type: "system" as NotificationType, category: "account" as NotificationCategory };

function actionUrlFor(data: Record<string, unknown> | null): string | undefined {
  if (!data) return undefined;
  if (typeof data.link === "string") return data.link;
  if (typeof data.orderId === "string") return `/orders/${data.orderId}`;
  if (typeof data.ticketId === "string") return `/tickets/${data.ticketId}`;
  if (typeof data.eventId === "string") return `/events/${data.eventId}`;
  return undefined;
}

export function mapNotification(n: BackendNotificationItem, userId: string): Notification {
  const kind = KIND[n.type] ?? FALLBACK;
  return {
    id: n.id,
    userId,
    type: kind.type,
    category: kind.category,
    title: n.title,
    message: n.body,
    read: n.readAt !== null,
    createdAt: n.createdAt,
    actionUrl: actionUrlFor(n.data),
    groupId: `grp_${kind.category}`,
  };
}

function failure(error: ApiError | null, fallback: string): Error {
  return new Error(error?.message || fallback);
}

export async function fetchNotificationFeed(userId: string): Promise<NotificationFeed> {
  const { data, error } = await apiClient.get<FeedResponse>(`/notifications?limit=${FEED_LIMIT}`);
  if (error || !data || !Array.isArray(data.items)) {
    throw failure(error, "Could not load your notifications.");
  }
  return {
    items: data.items.map((n) => mapNotification(n, userId)),
    unreadCount: data.meta?.unreadCount ?? data.items.filter((n) => n.readAt === null).length,
    total: data.meta?.total ?? data.items.length,
  };
}

export async function markNotificationReadLive(id: string): Promise<void> {
  const { error } = await apiClient.patch(`/notifications/${id}/read`, {});
  if (error) throw failure(error, "Could not mark that notification as read.");
}

export async function markAllNotificationsReadLive(): Promise<void> {
  const { error } = await apiClient.patch("/notifications/read-all", {});
  if (error) throw failure(error, "Could not mark your notifications as read.");
}

export async function deleteNotificationLive(id: string): Promise<void> {
  const { error } = await apiClient.delete(`/notifications/${id}`);
  if (error) throw failure(error, "Could not delete that notification.");
}

const CATEGORY_ORDER: NotificationCategory[] = [
  "orders",
  "messages",
  "marketplace",
  "bookings",
  "events",
  "campus",
  "payments",
  "account",
  "promotions",
];

/** Tabs for the notification centre, counted from the loaded feed. */
export function summarizeFeed(feed: NotificationFeed): NotificationCategorySummary[] {
  const counted = CATEGORY_ORDER.map((category) => {
    const items = feed.items.filter((n) => n.category === category);
    return {
      id: category,
      label: categoryLabels[category],
      count: items.length,
      unread: items.filter((n) => !n.read).length,
    };
  }).filter((s) => s.count > 0);

  return [
    { id: "all" as const, label: "All", count: feed.items.length, unread: feed.items.filter((n) => !n.read).length },
    ...counted,
  ];
}
