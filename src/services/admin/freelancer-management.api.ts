import { apiClient, type ApiError } from "@/lib/api-client";
import type {
  FreelancerActivityEvent,
  FreelancerStatusCounts,
  ManagedFreelancer,
  ManagedFreelancerDetail,
  ManagedFreelancersListQuery,
  Paginated,
} from "@/types/admin";
import type { AdminFreelancerManagementService } from "./freelancer-management.service";

/**
 * Live /admin/freelancers service backed by AdminFreelancersController
 * (GET /admin/freelancers, /counts, /categories, /:id, /:id/activity;
 * PATCH /:id/{suspend,activate,deactivate,feature,unfeature}).
 *
 * Console status is derived server-side: suspended (admin flag) > approved
 * (verified) > rejected > pending review. "Activate" lifts a suspension or
 * approves a pending profile; "Deactivate" rejects the profile.
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

function queryString(query: ManagedFreelancersListQuery): string {
  const params = new URLSearchParams();
  const set = (key: string, value: string | number | undefined) => {
    if (value === undefined || value === "" || value === "all") return;
    params.set(key, String(value));
  };
  set("q", query.search?.trim());
  set("status", query.status);
  set("category", query.categoryId);
  set("campusId", query.campusId);
  set("sortBy", query.sortBy);
  set("sortDir", query.sortDir);
  set("page", query.page);
  set("limit", query.pageSize);
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

async function patch(
  id: string,
  action: string,
  body: Record<string, string>,
  fallback: string
): Promise<ManagedFreelancer> {
  const { data, error } = await apiClient.patch<
    Record<string, string>,
    ManagedFreelancer
  >(`/admin/freelancers/${id}/${action}`, body);
  if (error) fail(error, fallback);
  return data;
}

export function createApiFreelancerManagementService(): AdminFreelancerManagementService {
  return {
    async list(query = {}) {
      const { data, error } = await apiClient.get<BackendPage<ManagedFreelancer>>(
        `/admin/freelancers${queryString(query)}`
      );
      if (error) fail(error, "Couldn't load freelancers.");
      const page: Paginated<ManagedFreelancer> = {
        items: data.items,
        page: data.meta.page,
        pageSize: data.meta.limit,
        total: data.meta.total,
        totalPages: Math.max(1, data.meta.totalPages),
      };
      return page;
    },

    async getById(id) {
      const { data, error } = await apiClient.get<ManagedFreelancerDetail>(
        `/admin/freelancers/${id}`
      );
      if (error?.status === 404) return null;
      if (error) fail(error, "Couldn't load the freelancer.");
      return data;
    },

    async getCounts() {
      const { data, error } = await apiClient.get<FreelancerStatusCounts>(
        "/admin/freelancers/counts"
      );
      if (error) fail(error, "Couldn't load freelancer counts.");
      return data;
    },

    async getCategories() {
      const { data, error } = await apiClient.get<string[]>(
        "/admin/freelancers/categories"
      );
      if (error) fail(error, "Couldn't load categories.");
      return data;
    },

    async suspend(id, _ctx, reason) {
      if (!reason?.trim()) throw new Error("A suspension reason is required.");
      return patch(id, "suspend", { reason: reason.trim() }, "Couldn't suspend the freelancer.");
    },
    activate: (id) => patch(id, "activate", {}, "Couldn't activate the freelancer."),
    async deactivate(id, _ctx, reason) {
      if (!reason?.trim()) throw new Error("A rejection reason is required.");
      return patch(id, "deactivate", { reason: reason.trim() }, "Couldn't reject the freelancer.");
    },
    feature: (id) => patch(id, "feature", {}, "Couldn't feature the freelancer."),
    unfeature: (id) => patch(id, "unfeature", {}, "Couldn't unfeature the freelancer."),

    async getActivity(id) {
      const { data, error } = await apiClient.get<FreelancerActivityEvent[]>(
        `/admin/freelancers/${id}/activity`
      );
      if (error) fail(error, "Couldn't load activity.");
      return data;
    },
  };
}
