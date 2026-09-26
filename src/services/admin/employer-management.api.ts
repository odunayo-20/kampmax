import { apiClient, type ApiError } from "@/lib/api-client";
import type {
  EmployerActivityEvent,
  EmployerStatusCounts,
  ManagedEmployer,
  ManagedEmployerDetail,
  ManagedEmployerListQuery,
  Paginated,
} from "@/types/admin";
import type { AdminEmployerManagementService } from "./employer-management.service";

/**
 * Live /admin/employers service backed by AdminEmployersController
 * (GET /admin/employers, /counts, /industries, /:id, /:id/activity;
 * PATCH /:id/{approve,reject,suspend,restore}).
 *
 * Console status is derived server-side: suspended (admin flag) > active
 * (verified) > rejected > pending review > incomplete. Rejecting and
 * suspending need a reason, which is emailed to the employer.
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

function queryString(query: ManagedEmployerListQuery): string {
  const params = new URLSearchParams();
  const set = (key: string, value: string | number | undefined) => {
    if (value === undefined || value === "" || value === "all") return;
    params.set(key, String(value));
  };
  set("q", query.search?.trim());
  set("status", query.status);
  set("verification", query.verification);
  set("campusId", query.campusId);
  set("industry", query.industry);
  set("sortBy", query.sortBy);
  set("sortDir", query.sortDir);
  set("page", query.page);
  set("limit", query.pageSize);
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

/** Campuses for the directory filter: [{ id, label }]. */
export async function fetchEmployerCampusOptions(): Promise<
  { id: string; label: string }[]
> {
  const { data, error } = await apiClient.get<{ id: string; label: string }[]>(
    "/admin/employers/campuses"
  );
  if (error) fail(error, "Couldn't load campuses.");
  return data;
}

async function patch(
  id: string,
  action: string,
  body: Record<string, string>,
  fallback: string
): Promise<ManagedEmployer> {
  const { data, error } = await apiClient.patch<
    Record<string, string>,
    ManagedEmployer
  >(`/admin/employers/${id}/${action}`, body);
  if (error) fail(error, fallback);
  return data;
}

export function createApiEmployerManagementService(): AdminEmployerManagementService {
  return {
    async list(query = {}) {
      const { data, error } = await apiClient.get<BackendPage<ManagedEmployer>>(
        `/admin/employers${queryString(query)}`
      );
      if (error) fail(error, "Couldn't load employers.");
      const page: Paginated<ManagedEmployer> = {
        items: data.items,
        page: data.meta.page,
        pageSize: data.meta.limit,
        total: data.meta.total,
        totalPages: Math.max(1, data.meta.totalPages),
      };
      return page;
    },

    async getById(id) {
      const { data, error } = await apiClient.get<ManagedEmployerDetail>(
        `/admin/employers/${id}`
      );
      if (error?.status === 404) return null;
      if (error) fail(error, "Couldn't load the employer.");
      return data;
    },

    async getCounts() {
      const { data, error } = await apiClient.get<EmployerStatusCounts>(
        "/admin/employers/counts"
      );
      if (error) fail(error, "Couldn't load employer counts.");
      return data;
    },

    async getIndustries() {
      const { data, error } = await apiClient.get<string[]>(
        "/admin/employers/industries"
      );
      if (error) fail(error, "Couldn't load industries.");
      return data;
    },

    approve: (id) => patch(id, "approve", {}, "Couldn't approve the employer."),
    restore: (id) => patch(id, "restore", {}, "Couldn't restore the employer."),

    async suspend(id, _ctx, reason) {
      if (!reason?.trim()) throw new Error("A suspension reason is required.");
      return patch(id, "suspend", { reason: reason.trim() }, "Couldn't suspend the employer.");
    },

    async reject(id, reason) {
      if (!reason?.trim()) throw new Error("A rejection reason is required.");
      return patch(id, "reject", { reason: reason.trim() }, "Couldn't reject the employer.");
    },

    async getActivity(id) {
      const { data, error } = await apiClient.get<EmployerActivityEvent[]>(
        `/admin/employers/${id}/activity`
      );
      if (error) fail(error, "Couldn't load activity.");
      return data;
    },
  };
}
