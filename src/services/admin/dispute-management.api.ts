import { apiClient, type ApiError } from "@/lib/api-client";
import type {
  CommunitySectionCounts,
  DisputeListQuery,
  ManagedDispute,
  ManagedDisputeStatus,
  Paginated,
} from "@/types/admin";
import type { AdminDisputeManagementService } from "./dispute-management.service";

/**
 * Live /admin/disputes service backed by AdminDisputesController
 * (GET /admin/disputes, /counts). Read-only case log over every order that
 * has ever carried a dispute — opening/resolving one happens on the Orders
 * console, which already has that real action surface.
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
    throw new Error("You don't have permission to view disputes.");
  }
  throw new Error(error.message || fallback);
}

function queryString(query: DisputeListQuery): string {
  const params = new URLSearchParams();
  const set = (key: string, value: string | number | null | undefined) => {
    if (value === undefined || value === null || value === "" || value === "all") return;
    params.set(key, String(value));
  };
  set("q", query.search?.trim());
  set("status", query.status);
  set("campusId", query.campusId);
  set("sortBy", query.sortBy);
  set("sortDir", query.sortDir);
  set("page", query.page);
  set("limit", query.pageSize);
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export function createApiDisputeManagementService(): AdminDisputeManagementService {
  return {
    async list(query = {}) {
      const { data, error } = await apiClient.get<BackendPage<ManagedDispute>>(
        `/admin/disputes${queryString(query)}`
      );
      if (error) fail(error, "Couldn't load disputes.");
      return {
        items: data.items,
        page: data.meta.page,
        pageSize: data.meta.limit,
        total: data.meta.total,
        totalPages: Math.max(1, data.meta.totalPages),
      } satisfies Paginated<ManagedDispute>;
    },

    async getCounts() {
      const { data, error } = await apiClient.get<
        CommunitySectionCounts<ManagedDisputeStatus>
      >("/admin/disputes/counts");
      if (error) fail(error, "Couldn't load dispute counts.");
      return data;
    },
  };
}
