import { apiClient, type ApiError } from "@/lib/api-client";
import type {
  ManagedReviewCounts,
  ManagedReviewDetail,
  ManagedReviewFacets,
  ManagedReviewListQuery,
  ManagedReviewRow,
  ModerateReviewInput,
  Paginated,
} from "@/types/admin";
import type { AdminReviewManagementService } from "./review-management.service";

/**
 * Live /admin/reviews service backed by AdminReviewsController
 * (GET /admin/reviews, /counts, /facets, /:id, PATCH /:id/moderate).
 * One real store (`reviews`) over every target kind — enriched with
 * reviewer/target names server-side and moderated for real.
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
    throw new Error("You don't have permission to view reviews.");
  }
  throw new Error(error.message || fallback);
}

function queryString(query: ManagedReviewListQuery): string {
  const params = new URLSearchParams();
  const set = (key: string, value: string | number | boolean | null | undefined) => {
    if (value === undefined || value === null || value === "" || value === "all") return;
    if (value === false) return;
    params.set(key, String(value));
  };
  set("q", query.search?.trim());
  set("status", query.status);
  set("targetType", query.targetType);
  set("rating", query.rating);
  set("vendorId", query.vendorId);
  set("response", query.response);
  set("reportedOnly", query.reportedOnly);
  set("sortBy", query.sortBy);
  set("sortDir", query.sortDir);
  set("page", query.page);
  set("limit", query.pageSize);
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export function createApiReviewManagementService(): AdminReviewManagementService {
  return {
    async list(query = {}) {
      const { data, error } = await apiClient.get<BackendPage<ManagedReviewRow>>(
        `/admin/reviews${queryString(query)}`
      );
      if (error) fail(error, "Couldn't load reviews.");
      return {
        items: data.items,
        page: data.meta.page,
        pageSize: data.meta.limit,
        total: data.meta.total,
        totalPages: Math.max(1, data.meta.totalPages),
      } satisfies Paginated<ManagedReviewRow>;
    },

    async getById(id) {
      const { data, error } = await apiClient.get<ManagedReviewDetail>(
        `/admin/reviews/${encodeURIComponent(id)}`
      );
      if (error?.status === 404) return null;
      if (error) fail(error, "Couldn't load the review.");
      return data;
    },

    async getCounts() {
      const { data, error } = await apiClient.get<ManagedReviewCounts>(
        "/admin/reviews/counts"
      );
      if (error) fail(error, "Couldn't load review counts.");
      return data;
    },

    async getFacets() {
      const { data, error } = await apiClient.get<ManagedReviewFacets>(
        "/admin/reviews/facets"
      );
      if (error) fail(error, "Couldn't load review filters.");
      return data;
    },

    async getVendorOptions() {
      const { data, error } = await apiClient.get<ManagedReviewFacets>(
        "/admin/reviews/facets"
      );
      if (error) fail(error, "Couldn't load vendor options.");
      return data.vendors.map((v) => ({ id: v.id, name: v.name }));
    },

    async moderateReview(id, input) {
      const { data, error } = await apiClient.patch<ModerateReviewInput, ManagedReviewDetail>(
        `/admin/reviews/${encodeURIComponent(id)}/moderate`,
        input
      );
      if (error) fail(error, "Couldn't moderate the review.");
      return data;
    },
  };
}
