import { apiClient } from "@/lib/api-client";
import type {
  AdminNotification,
  BroadcastStatus,
  ManagedNotificationRow,
  Paginated,
} from "@/types/admin";
import type { AdminNotificationService } from "./notifications.service";

/**
 * Live /admin notifications service connecting the legacy AdminNotificationService
 * contract to the real /admin/notifications endpoint.
 */
export function createApiNotificationService(): AdminNotificationService {
  return {
    async list(): Promise<AdminNotification[]> {
      const { data, error } = await apiClient.get<Paginated<ManagedNotificationRow>>(
        "/admin/notifications?limit=20"
      );
      if (error || !data?.items) return [];

      return data.items.map((n) => ({
        id: n.id,
        title: n.title,
        body: n.body,
        audience: "all",
        campusId: null,
        sentBy: n.recipientName || "Platform Admin",
        sentAt: n.createdAt,
        recipients: 1,
        openRate: n.read ? 100 : 0,
        status: "sent" as BroadcastStatus,
      }));
    },

    async send(input): Promise<AdminNotification> {
      const { data, error } = await apiClient.post<
        Record<string, unknown>,
        { id: string; title: string; body: string; createdAt: string }
      >("/admin/notifications", {
        audience:
          input.audience === "all"
            ? "all_users"
            : input.audience === "students"
            ? "customers"
            : input.audience === "campus"
            ? "campus"
            : "vendors",
        title: input.title,
        body: input.body,
        campusId: input.campusId ?? undefined,
      });

      if (error) {
        throw new Error(error.message || "Failed to send notification.");
      }

      return {
        id: data?.id ?? `ntf-${Date.now()}`,
        title: input.title,
        body: input.body,
        audience: input.audience,
        campusId: input.campusId,
        sentBy: "Current Admin",
        sentAt: data?.createdAt ?? new Date().toISOString(),
        recipients: 1,
        openRate: 0,
        status: "sent",
      };
    },
  };
}
