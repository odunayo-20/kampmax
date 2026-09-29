import { apiClient, type ApiError } from "@/lib/api-client";
import type {
  AdminNotificationBroadcastService,
  ManagedNotificationAudiencePreview,
  ManagedNotificationBroadcastInput,
  ManagedNotificationBroadcastResult,
  ManagedNotificationOverview,
  ManagedNotificationQuery,
  ManagedNotificationRow,
  Paginated,
} from "@/types/admin";

/**
 * Live /admin/notifications service backed by AdminNotificationsController
 * (GET /admin/notifications, /overview, /audience-preview, /:id, POST /).
 * Real in-app dispatch to a resolved audience — in-app only, no email/push.
 */

interface BackendPage<T> {
  items: T[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

function fail(error: ApiError, fallback: string): never {
  if (error.status === 401) {
    throw new Error("You're signed out. Sign in again to continue.");
  }
  if (error.status === 403) {
    throw new Error("You don't have permission to manage notifications.");
  }
  throw new Error(error.message || fallback);
}

function queryString(query: ManagedNotificationQuery): string {
  const params = new URLSearchParams();
  const set = (key: string, value: string | number | null | undefined) => {
    if (value === undefined || value === null || value === "" || value === "all") return;
    params.set(key, String(value));
  };
  set("q", query.search?.trim());
  set("type", query.type);
  set("read", query.read);
  set("page", query.page);
  set("limit", query.pageSize);
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export function createApiNotificationBroadcastService(): AdminNotificationBroadcastService {
  return {
    async getOverview() {
      const { data, error } = await apiClient.get<ManagedNotificationOverview>(
        "/admin/notifications/overview"
      );
      if (error) fail(error, "Couldn't load the notifications overview.");
      return data;
    },

    async list(query = {}) {
      const { data, error } = await apiClient.get<BackendPage<ManagedNotificationRow>>(
        `/admin/notifications${queryString(query)}`
      );
      if (error) fail(error, "Couldn't load notifications.");
      return {
        items: data.items,
        page: data.meta.page,
        pageSize: data.meta.limit,
        total: data.meta.total,
        totalPages: Math.max(1, data.meta.totalPages),
      } satisfies Paginated<ManagedNotificationRow>;
    },

    async getById(id) {
      const { data, error } = await apiClient.get<ManagedNotificationRow>(
        `/admin/notifications/${encodeURIComponent(id)}`
      );
      if (error?.status === 404) return null;
      if (error) fail(error, "Couldn't load the notification.");
      return data;
    },

    async getAudiencePreview(audience, campusId, userId) {
      const params = new URLSearchParams({ audience });
      if (campusId) params.set("campusId", campusId);
      if (userId) params.set("userId", userId);
      const { data, error } = await apiClient.get<ManagedNotificationAudiencePreview>(
        `/admin/notifications/audience-preview?${params.toString()}`
      );
      if (error) fail(error, "Couldn't preview the audience.");
      return data;
    },

    async create(input) {
      const { data, error } = await apiClient.post<
        ManagedNotificationBroadcastInput,
        ManagedNotificationBroadcastResult
      >("/admin/notifications", input);
      if (error?.status === 400) {
        throw new Error(error.message || "This notification can't be sent.");
      }
      if (error) fail(error, "Couldn't send the notification.");
      return data;
    },
  };
}
