import { apiClient, type ApiError } from "@/lib/api-client";
import type {
  ManagedJobActivityEvent,
  ManagedJobDetail,
  ManagedJobFacets,
  ManagedJobListQuery,
  ManagedJobRow,
  ManagedJobStatusCounts,
  Paginated,
} from "@/types/admin";
import type { AdminJobManagementService } from "./job-management.service";

/**
 * Live /admin/jobs service backed by AdminJobsController
 * (GET /admin/jobs, /counts, /facets, /:id, /:id/activity). Read-only.
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
    throw new Error("You don't have permission to do that.");
  }
  throw new Error(error.message || fallback);
}

function queryString(query: ManagedJobListQuery): string {
  const params = new URLSearchParams();
  const set = (key: string, value: string | number | undefined) => {
    if (value === undefined || value === "" || value === "all") return;
    params.set(key, String(value));
  };
  set("q", query.search?.trim());
  set("status", query.status);
  set("publication", query.publication);
  set("categoryId", query.categoryId);
  set("campusId", query.campusId);
  set("employerId", query.employerId);
  set("arrangement", query.arrangement);
  set("sortBy", query.sortBy);
  set("sortDir", query.sortDir);
  set("page", query.page);
  set("limit", query.pageSize);
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export function createApiJobManagementService(): AdminJobManagementService {
  return {
    async list(query = {}) {
      const { data, error } = await apiClient.get<BackendPage<ManagedJobRow>>(
        `/admin/jobs${queryString(query)}`
      );
      if (error) fail(error, "Couldn't load jobs.");
      const page: Paginated<ManagedJobRow> = {
        items: data.items,
        page: data.meta.page,
        pageSize: data.meta.limit,
        total: data.meta.total,
        totalPages: Math.max(1, data.meta.totalPages),
      };
      return page;
    },

    async getById(id) {
      const { data, error } = await apiClient.get<ManagedJobDetail>(
        `/admin/jobs/${id}`
      );
      if (error?.status === 404) return null;
      if (error) fail(error, "Couldn't load the job.");
      return data;
    },

    async getCounts() {
      const { data, error } = await apiClient.get<ManagedJobStatusCounts>(
        "/admin/jobs/counts"
      );
      if (error) fail(error, "Couldn't load job counts.");
      return data;
    },

    async getFacets() {
      const { data, error } = await apiClient.get<ManagedJobFacets>(
        "/admin/jobs/facets"
      );
      if (error) fail(error, "Couldn't load job filters.");
      return data;
    },

    async getActivity(id) {
      const { data, error } = await apiClient.get<ManagedJobActivityEvent[]>(
        `/admin/jobs/${id}/activity`
      );
      if (error) fail(error, "Couldn't load job activity.");
      return data;
    },
  };
}
