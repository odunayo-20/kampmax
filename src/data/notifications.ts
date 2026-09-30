import { Notification } from "@/types";

export const notifications: Notification[] = [
  // ── ORDERS ──
  {
    id: "n1",
    userId: "u1",
    type: "order_update",
    category: "orders",
    title: "Order Confirmed",
    message: "Your order #KMP-4102 has been confirmed by StyleByChi.",
    read: false,
    createdAt: "2025-01-14T15:30:00Z",
    actionUrl: "/orders/KMP-4102",
    groupId: "grp_orders",
  },
  {
    id: "n2",
    userId: "u1",
    type: "order_update",
    category: "orders",
    title: "Order Delivered",
    message: "Your order #KMP-3847 has been delivered. Rate your experience!",
    read: true,
    createdAt: "2025-01-12T10:15:00Z",
    actionUrl: "/orders/KMP-3847",
    groupId: "grp_orders",
  },
  {
    id: "n3",
    userId: "u1",
    type: "order_update",
    category: "orders",
    title: "Order Shipped",
    message: "Your order #KMP-4102 is on its way! Expected delivery: tomorrow.",
    read: false,
    createdAt: "2025-01-14T09:00:00Z",
    actionUrl: "/orders/KMP-4102",
    groupId: "grp_orders",
  },
  {
    id: "n4",
    userId: "u1",
    type: "order_update",
    category: "orders",
    title: "Order Cancelled",
    message: "Your order #KMP-3901 has been cancelled. Refund will be processed within 24 hours.",
    read: true,
    createdAt: "2025-01-10T16:00:00Z",
    actionUrl: "/orders/KMP-3901",
    groupId: "grp_orders",
  },

  // ── MESSAGES ──
  {
    id: "n5",
    userId: "u1",
    type: "message",
    category: "messages",
    title: "New Message from Ibrahim",
    message: "Ibrahim from TechHub Owo sent you a message about your inquiry.",
    read: false,
    createdAt: "2025-01-14T14:22:00Z",
    actionUrl: "/chat",
    groupId: "grp_messages",
  },
  {
    id: "n6",
    userId: "u1",
    type: "message",
    category: "messages",
    title: "New Message from Chioma",
    message: "Chioma replied to your message about Nike Air Max.",
    read: false,
    createdAt: "2025-01-14T13:10:00Z",
    actionUrl: "/chat",
    groupId: "grp_messages",
  },
  {
    id: "n7",
    userId: "u1",
    type: "message",
    category: "messages",
    title: "Vendor Inquiry",
    message: "A student asked about your Engineering Mathematics textbook.",
    read: true,
    createdAt: "2025-01-13T11:00:00Z",
    actionUrl: "/chat",
    groupId: "grp_messages",
  },

  // ── MARKETPLACE ──
  {
    id: "n8",
    userId: "u1",
    type: "marketplace",
    category: "marketplace",
    title: "Price Drop Alert",
    message: "A product on your wishlist dropped in price! Check it out before it's gone.",
    read: false,
    createdAt: "2025-01-14T12:00:00Z",
    actionUrl: "/marketplace",
    groupId: "grp_marketplace",
  },
  {
    id: "n9",
    userId: "u1",
    type: "marketplace",
    category: "marketplace",
    title: "New Listing Near You",
    message: "A new iPhone 15 Pro was listed near RUGIPO campus. ₦450,000",
    read: false,
    createdAt: "2025-01-14T10:30:00Z",
    actionUrl: "/marketplace",
    groupId: "grp_marketplace",
  },
  {
    id: "n10",
    userId: "u1",
    type: "marketplace",
    category: "marketplace",
    title: "Back in Stock",
    message: "HP Pavilion Laptop you bookmarked is back in stock at TechHub Owo.",
    read: true,
    createdAt: "2025-01-12T09:00:00Z",
    actionUrl: "/marketplace",
    groupId: "grp_marketplace",
  },

  // ── CAMPUS ──
  {
    id: "n11",
    userId: "u1",
    type: "campus",
    category: "campus",
    title: "New Post in RUGIPO",
    message: "Emeka posted a new event: 'End of Semester Sale' in Campus Events.",
    read: false,
    createdAt: "2025-01-14T12:00:00Z",
    actionUrl: "/community",
    groupId: "grp_campus",
  },
  {
    id: "n12",
    userId: "u1",
    type: "campus",
    category: "campus",
    title: "Poll Reminder",
    message: "Vote now: When should we have the next campus hangout?",
    read: false,
    createdAt: "2025-01-14T11:00:00Z",
    actionUrl: "/community",
    groupId: "grp_campus",
  },
  {
    id: "n13",
    userId: "u1",
    type: "campus",
    category: "campus",
    title: "Event Starting Soon",
    message: "Tech Meetup: Introduction to Web Development starts in 2 hours.",
    read: true,
    createdAt: "2025-01-14T12:00:00Z",
    actionUrl: "/community",
    groupId: "grp_campus",
  },
  {
    id: "n14",
    userId: "u1",
    type: "campus",
    category: "campus",
    title: "Announcement",
    message: "Mid-Semester Break: No classes from February 3rd - 10th.",
    read: true,
    createdAt: "2025-01-13T08:00:00Z",
    actionUrl: "/community",
    groupId: "grp_campus",
  },

  // ── PAYMENTS ──
  {
    id: "n15",
    userId: "u1",
    type: "payments",
    category: "payments",
    title: "Payment Successful",
    message: "Payment of ₦8,500 for order #KMP-4102 confirmed via Paystack.",
    read: false,
    createdAt: "2025-01-14T15:25:00Z",
    actionUrl: "/orders/KMP-4102",
    groupId: "grp_payments",
  },
  {
    id: "n16",
    userId: "u1",
    type: "payments",
    category: "payments",
    title: "Refund Processed",
    message: "Refund of ₦12,000 for order #KMP-3901 has been processed.",
    read: true,
    createdAt: "2025-01-11T14:00:00Z",
    actionUrl: "/profile/wallet",
    groupId: "grp_payments",
  },
  {
    id: "n17",
    userId: "u1",
    type: "payments",
    category: "payments",
    title: "Wallet Top-Up",
    message: "Your wallet has been credited with ₦5,000. New balance: ₦15,000.",
    read: true,
    createdAt: "2025-01-10T09:00:00Z",
    actionUrl: "/profile/wallet",
    groupId: "grp_payments",
  },

  // ── ACCOUNT ──
  {
    id: "n18",
    userId: "u1",
    type: "account",
    category: "account",
    title: "Welcome to Kampmax",
    message: "Your account has been verified. Start buying and selling on campus!",
    read: true,
    createdAt: "2024-09-01T09:00:00Z",
    groupId: "grp_account",
  },
  {
    id: "n19",
    userId: "u1",
    type: "account",
    category: "account",
    title: "Profile Updated",
    message: "Your profile information has been successfully updated.",
    read: true,
    createdAt: "2025-01-12T10:00:00Z",
    groupId: "grp_account",
  },
  {
    id: "n20",
    userId: "u1",
    type: "account",
    category: "account",
    title: "Security Alert",
    message: "Your password was changed. If this wasn't you, contact support immediately.",
    read: false,
    createdAt: "2025-01-14T08:00:00Z",
    groupId: "grp_account",
  },

  // ── PROMOTIONS ──
  {
    id: "n21",
    userId: "u1",
    type: "promotion",
    category: "promotions",
    title: "Weekend Flash Sale",
    message: "Up to 40% off electronics at TechHub Owo this weekend!",
    read: false,
    createdAt: "2025-01-14T08:00:00Z",
    groupId: "grp_promotions",
  },
  {
    id: "n22",
    userId: "u1",
    type: "promotion",
    category: "promotions",
    title: "Loyalty Points Bonus",
    message: "You've earned 50 bonus loyalty points! Use them on your next order.",
    read: true,
    createdAt: "2025-01-13T12:00:00Z",
    groupId: "grp_promotions",
  },
  {
    id: "n23",
    userId: "u1",
    type: "promotion",
    category: "promotions",
    title: "Exclusive Campus Deal",
    message: "Use code CAMPUS10 for 10% off your next order. Valid until Jan 31.",
    read: true,
    createdAt: "2025-01-10T08:00:00Z",
    groupId: "grp_promotions",
  },
];

export function getNotificationsByUser(userId: string): Notification[] {
  return notifications
    .filter((n) => n.userId === userId)
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
}

export function getUnreadCount(userId: string): number {
  return notifications.filter((n) => n.userId === userId && !n.read).length;
}

// ────────────────────────────────────────────────────────────────
// Mutation records + change notifications
//
// Every record mutation goes through the functions below so consumers
// (TanStack Query's NotificationSyncBridge) can refresh caches in sync
// with the authoritative in-memory store — no polling needed.
// ────────────────────────────────────────────────────────────────

type NotificationChangeListener = () => void;

const changeListeners = new Set<NotificationChangeListener>();

export function subscribeToNotificationChanges(
  listener: NotificationChangeListener
): () => void {
  changeListeners.add(listener);
  return () => {
    changeListeners.delete(listener);
  };
}

function emitNotificationsChanged(): void {
  changeListeners.forEach((listener) => listener());
}

export interface PushNotificationRecordInput {
  userId: string;
  type: Notification["type"];
  category: Notification["category"];
  title: string;
  message: string;
  actionUrl?: string;
  groupId?: string;
  imageUrl?: string;
}

export function pushNotificationRecord(
  input: PushNotificationRecordInput
): Notification {
  const notification: Notification = {
    id: `n_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
    userId: input.userId,
    type: input.type,
    category: input.category,
    title: input.title,
    message: input.message,
    read: false,
    createdAt: new Date().toISOString(),
    actionUrl: input.actionUrl,
    imageUrl: input.imageUrl,
    groupId: input.groupId,
  };
  notifications.unshift(notification);
  emitNotificationsChanged();
  return notification;
}

/**
 * Merges notifications that came from the backend into the store. Existing
 * entries are never duplicated, and a server-side "read" flag is applied but
 * never reverted, so a local read survives a slow round trip.
 */
export function upsertServerNotifications(
  userId: string,
  incoming: Array<Omit<Notification, "userId">>
): void {
  let changed = false;
  for (const item of incoming) {
    const existing = notifications.find(
      (n) => n.id === item.id && n.userId === userId
    );
    if (!existing) {
      notifications.unshift({ ...item, userId });
      changed = true;
    } else if (item.read && !existing.read) {
      existing.read = true;
      changed = true;
    }
  }
  if (changed) emitNotificationsChanged();
}

export function markNotificationRead(notificationId: string): boolean {
  const n = notifications.find((n) => n.id === notificationId);
  if (!n || n.read) return false;
  n.read = true;
  emitNotificationsChanged();
  return true;
}

export function markAllNotificationsRead(userId: string): number {
  const targets = notifications.filter(
    (n) => n.userId === userId && !n.read
  );
  if (targets.length === 0) return 0;
  targets.forEach((n) => (n.read = true));
  emitNotificationsChanged();
  return targets.length;
}

export function deleteNotificationRecord(notificationId: string): boolean {
  const idx = notifications.findIndex((n) => n.id === notificationId);
  if (idx === -1) return false;
  notifications.splice(idx, 1);
  emitNotificationsChanged();
  return true;
}
