import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api-client", () => ({ apiClient: {} }));

import {
  isServerNotificationId,
  mapServerNotification,
} from "../event-notification-sync";
import type { BackendNotification } from "../event-tickets";
import { upsertServerNotifications, getNotificationsByUser } from "@/data/notifications";

const base: BackendNotification = {
  id: "0b1e6f1e-0000-4000-8000-000000000001",
  type: "EVENT",
  title: "Event Joined",
  body: "You've successfully registered for Summit.",
  data: { kind: "joined", ticketId: "t-1", eventId: "e-1" },
  readAt: null,
  createdAt: "2026-10-10T14:10:00.000Z",
};

describe("mapServerNotification", () => {
  it("maps into the events category with a prefixed id", () => {
    const mapped = mapServerNotification(base);
    expect(mapped.id).toBe(`srv_${base.id}`);
    expect(mapped.category).toBe("events");
    expect(mapped.type).toBe("event");
    expect(mapped.read).toBe(false);
    expect(isServerNotificationId(mapped.id)).toBe(true);
    expect(isServerNotificationId("n1")).toBe(false);
  });

  it("links joined/payment notifications to the ticket", () => {
    expect(mapServerNotification(base).actionUrl).toBe("/tickets/t-1");
    expect(
      mapServerNotification({ ...base, data: { kind: "payment" } }).actionUrl
    ).toBe("/tickets");
  });

  it("links reminders and updates to the event", () => {
    expect(
      mapServerNotification({ ...base, data: { kind: "reminder", eventId: "e-9" } })
        .actionUrl
    ).toBe("/events/e-9");
  });

  it("prefers an explicit link (organizer decisions)", () => {
    expect(
      mapServerNotification({ ...base, data: { kind: "update", link: "/organizer" } })
        .actionUrl
    ).toBe("/organizer");
  });

  it("treats readAt as read", () => {
    expect(
      mapServerNotification({ ...base, readAt: "2026-10-10T15:00:00.000Z" }).read
    ).toBe(true);
  });
});

describe("upsertServerNotifications", () => {
  it("does not duplicate, and never reverts a local read", () => {
    const userId = "user-sync-test";
    const item = mapServerNotification(base);
    upsertServerNotifications(userId, [item]);
    upsertServerNotifications(userId, [item]);
    expect(getNotificationsByUser(userId)).toHaveLength(1);

    // Server later reports it read -> applied.
    upsertServerNotifications(userId, [{ ...item, read: true }]);
    expect(getNotificationsByUser(userId)[0].read).toBe(true);

    // A stale unread copy must not flip it back.
    upsertServerNotifications(userId, [{ ...item, read: false }]);
    expect(getNotificationsByUser(userId)[0].read).toBe(true);
  });
});
