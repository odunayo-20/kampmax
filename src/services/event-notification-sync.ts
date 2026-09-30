import type { Notification } from "@/types";
import { upsertServerNotifications } from "@/data/notifications";
import {
  listEventNotificationsApi,
  markServerNotificationReadApi,
  type BackendNotification,
} from "./event-tickets";

/** Prefix that marks a store entry as mirrored from the backend. */
export const SERVER_NOTIFICATION_PREFIX = "srv_";

export function isServerNotificationId(id: string): boolean {
  return id.startsWith(SERVER_NOTIFICATION_PREFIX);
}

function actionUrlFor(n: BackendNotification): string | undefined {
  const data = n.data ?? {};
  if (typeof data.link === "string") return data.link;
  const ticketId = typeof data.ticketId === "string" ? data.ticketId : null;
  const eventId = typeof data.eventId === "string" ? data.eventId : null;
  if (data.kind === "joined" || data.kind === "payment") {
    return ticketId ? `/tickets/${ticketId}` : "/tickets";
  }
  return eventId ? `/events/${eventId}` : undefined;
}

export function mapServerNotification(
  n: BackendNotification
): Omit<Notification, "userId"> {
  return {
    id: `${SERVER_NOTIFICATION_PREFIX}${n.id}`,
    type: "event",
    category: "events",
    title: n.title,
    message: n.body,
    read: n.readAt !== null,
    createdAt: n.createdAt,
    actionUrl: actionUrlFor(n),
    groupId: "grp_events",
  };
}

/** Pulls the signed-in user's real event notifications into the local feed. */
export async function syncEventNotifications(userId: string): Promise<void> {
  const items = await listEventNotificationsApi();
  upsertServerNotifications(userId, items.map(mapServerNotification));
}

/** Persists a read state for a mirrored notification; local ones are ignored. */
export async function persistNotificationRead(id: string): Promise<void> {
  if (!isServerNotificationId(id)) return;
  await markServerNotificationReadApi(id.slice(SERVER_NOTIFICATION_PREFIX.length));
}
