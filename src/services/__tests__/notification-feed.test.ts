import { beforeEach, describe, expect, it, vi } from "vitest";

const get = vi.fn();
const patch = vi.fn();
const del = vi.fn();
vi.mock("@/lib/api-client", () => ({
  apiClient: {
    get: (...a: unknown[]) => get(...a),
    patch: (...a: unknown[]) => patch(...a),
    delete: (...a: unknown[]) => del(...a),
  },
}));

import {
  deleteNotificationLive,
  fetchNotificationFeed,
  markAllNotificationsReadLive,
  markNotificationReadLive,
  summarizeFeed,
} from "../notification-feed";

const item = (over: Record<string, unknown> = {}) => ({
  id: "n1",
  type: "ORDER",
  title: "Order shipped",
  body: "On its way",
  data: null,
  readAt: null,
  createdAt: "2026-10-01T10:00:00Z",
  ...over,
});

beforeEach(() => vi.clearAllMocks());

describe("fetchNotificationFeed", () => {
  it("maps backend types to the categories the page groups by", async () => {
    get.mockResolvedValue({
      data: {
        items: [
          item(),
          item({ id: "n2", type: "EVENT", readAt: "2026-10-01T11:00:00Z", data: { ticketId: "t1" } }),
          item({ id: "n3", type: "VENDOR", data: { link: "/vendor/orders/9" } }),
        ],
        meta: { total: 3, unreadCount: 2 },
      },
      error: null,
    });

    const feed = await fetchNotificationFeed("u1");

    expect(feed.unreadCount).toBe(2);
    expect(feed.items.map((n) => [n.id, n.category, n.read])).toEqual([
      ["n1", "orders", false],
      ["n2", "events", true],
      ["n3", "marketplace", false],
    ]);
    expect(feed.items[1].actionUrl).toBe("/tickets/t1");
    expect(feed.items[2].actionUrl).toBe("/vendor/orders/9");
  });

  it("shows an unknown type under account instead of dropping it", async () => {
    get.mockResolvedValue({ data: { items: [item({ type: "NEW_THING" })], meta: { total: 1, unreadCount: 1 } }, error: null });
    expect((await fetchNotificationFeed("u1")).items[0].category).toBe("account");
  });

  it("throws rather than showing made-up notifications", async () => {
    get.mockResolvedValue({ data: null, error: { message: "down", status: 500 } });
    await expect(fetchNotificationFeed("u1")).rejects.toThrow("down");
  });
});

describe("writes", () => {
  it("call the real endpoints and surface failures", async () => {
    patch.mockResolvedValue({ data: {}, error: null });
    del.mockResolvedValue({ data: null, error: null });
    await markNotificationReadLive("n1");
    await markAllNotificationsReadLive();
    await deleteNotificationLive("n1");
    expect(patch).toHaveBeenCalledWith("/notifications/n1/read", {});
    expect(patch).toHaveBeenCalledWith("/notifications/read-all", {});
    expect(del).toHaveBeenCalledWith("/notifications/n1");

    del.mockResolvedValue({ data: null, error: { message: "Notification not found", status: 404 } });
    await expect(deleteNotificationLive("n1")).rejects.toThrow("Notification not found");
  });
});

describe("summarizeFeed", () => {
  it("counts the all tab from the same items as the category tabs", async () => {
    get.mockResolvedValue({
      data: { items: [item(), item({ id: "n2", readAt: "x" }), item({ id: "n3", type: "EVENT" })], meta: { total: 3, unreadCount: 2 } },
      error: null,
    });
    const tabs = summarizeFeed(await fetchNotificationFeed("u1"));
    expect(tabs.map((t) => [t.id, t.count, t.unread])).toEqual([
      ["all", 3, 2],
      ["orders", 2, 1],
      ["events", 1, 1],
    ]);
  });
});
