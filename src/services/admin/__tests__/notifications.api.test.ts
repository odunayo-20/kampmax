import { beforeEach, describe, expect, it, vi } from "vitest";

const getMock = vi.hoisted(() => vi.fn());
const postMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/api-client", () => ({
  apiClient: {
    get: getMock,
    post: postMock,
  },
}));

import { createApiNotificationService } from "../notifications.api";

describe("createApiNotificationService", () => {
  const service = createApiNotificationService();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("list", () => {
    it("fetches notifications from /admin/notifications and maps them to AdminNotification", async () => {
      getMock.mockResolvedValue({
        data: {
          items: [
            {
              id: "notif-1",
              title: "Order Delivered",
              body: "Order #1234 has been completed.",
              type: "ORDER",
              recipientName: "John Doe",
              read: true,
              createdAt: "2026-03-29T10:00:00.000Z",
            },
            {
              id: "notif-2",
              title: "Payment Received",
              body: "Wallet funded with 5,000 NGN.",
              type: "PAYMENT",
              recipientName: "Jane Smith",
              read: false,
              createdAt: "2026-03-29T11:00:00.000Z",
            },
          ],
          meta: { total: 2, page: 1, limit: 20, totalPages: 1 },
        },
        error: null,
      });

      const items = await service.list();

      expect(getMock).toHaveBeenCalledWith("/admin/notifications?limit=20");
      expect(items).toHaveLength(2);
      expect(items[0]).toEqual({
        id: "notif-1",
        title: "Order Delivered",
        body: "Order #1234 has been completed.",
        audience: "all",
        campusId: null,
        sentBy: "John Doe",
        sentAt: "2026-03-29T10:00:00.000Z",
        recipients: 1,
        openRate: 100,
        status: "sent",
      });
      expect(items[1].openRate).toBe(0);
    });

    it("returns empty array on error or empty response", async () => {
      getMock.mockResolvedValue({ data: null, error: { message: "Failed" } });

      const items = await service.list();
      expect(items).toEqual([]);
    });
  });

  describe("send", () => {
    it("dispatches notification via POST /admin/notifications", async () => {
      postMock.mockResolvedValue({
        data: {
          id: "notif-new",
          title: "System Update",
          body: "Scheduled maintenance tonight.",
          createdAt: "2026-03-29T12:00:00.000Z",
        },
        error: null,
      });

      const result = await service.send({
        title: "System Update",
        body: "Scheduled maintenance tonight.",
        audience: "all",
        campusId: null,
      });

      expect(postMock).toHaveBeenCalledWith("/admin/notifications", {
        audience: "all_users",
        title: "System Update",
        body: "Scheduled maintenance tonight.",
        campusId: undefined,
      });
      expect(result.id).toBe("notif-new");
      expect(result.title).toBe("System Update");
      expect(result.status).toBe("sent");
    });
  });
});
