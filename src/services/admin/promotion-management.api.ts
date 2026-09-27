import { apiClient, type ApiError } from "@/lib/api-client";
import type {
  ManagedPromotion,
  ManagedPromotionStatus,
  Paginated,
  PromotionInput,
  PromotionListQuery,
  PromotionStatusCounts,
  PromotionTargetingOptions,
} from "@/types/admin";
import type { AdminPromotionManagementService } from "./promotion-management.service";

/**
 * Live /admin/promotions service backed by AdminPromotionsController
 * (GET /admin/promotions, /counts, /targeting-options, /:id;
 * POST /admin/promotions; PATCH /:id, /:id/status; DELETE /:id).
 *
 * A promotion is a percentage or fixed-amount promo code. It can target
 * products, one category or one vendor, be limited to campuses, and be
 * featured on the storefront home or deals page. Vendor-run promotions can
 * only be paused, resumed or ended here.
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

function queryString(query: PromotionListQuery): string {
  const params = new URLSearchParams();
  const set = (key: string, value: string | number | undefined) => {
    if (value === undefined || value === "" || value === "all") return;
    params.set(key, String(value));
  };
  set("q", query.search?.trim());
  set("type", query.type);
  set("status", query.status);
  set("campusId", query.campusId);
  set("sortBy", query.sortBy);
  set("sortDir", query.sortDir);
  set("page", query.page);
  set("limit", query.pageSize);
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export function createApiPromotionManagementService(): AdminPromotionManagementService {
  return {
    async list(query = {}) {
      const { data, error } = await apiClient.get<BackendPage<ManagedPromotion>>(
        `/admin/promotions${queryString(query)}`
      );
      if (error) fail(error, "Couldn't load promotions.");
      const page: Paginated<ManagedPromotion> = {
        items: data.items,
        page: data.meta.page,
        pageSize: data.meta.limit,
        total: data.meta.total,
        totalPages: Math.max(1, data.meta.totalPages),
      };
      return page;
    },

    async getById(id) {
      const { data, error } = await apiClient.get<ManagedPromotion>(
        `/admin/promotions/${id}`
      );
      if (error?.status === 404 || error?.status === 400) return null;
      if (error) fail(error, "Couldn't load the promotion.");
      return data;
    },

    async getCounts() {
      const { data, error } = await apiClient.get<PromotionStatusCounts>(
        "/admin/promotions/counts"
      );
      if (error) fail(error, "Couldn't load promotion counts.");
      return data;
    },

    async getTargetingOptions() {
      const { data, error } = await apiClient.get<PromotionTargetingOptions>(
        "/admin/promotions/targeting-options"
      );
      if (error) fail(error, "Couldn't load targeting options.");
      return data;
    },

    async create(input) {
      const { data, error } = await apiClient.post<
        PromotionInput,
        ManagedPromotion
      >("/admin/promotions", input);
      if (error) fail(error, "Couldn't create the promotion.");
      return data;
    },

    async update(id, patch) {
      const { data, error } = await apiClient.patch<
        Partial<PromotionInput>,
        ManagedPromotion
      >(`/admin/promotions/${id}`, patch);
      if (error) fail(error, "Couldn't save the promotion.");
      return data;
    },

    async setStatus(id: string, status: ManagedPromotionStatus) {
      const { data, error } = await apiClient.patch<
        { status: ManagedPromotionStatus },
        ManagedPromotion
      >(`/admin/promotions/${id}/status`, { status });
      if (error) fail(error, "Couldn't update the promotion.");
      return data;
    },

    async remove(id) {
      const { error } = await apiClient.delete(`/admin/promotions/${id}`);
      if (error) fail(error, "Couldn't delete the promotion.");
    },
  };
}
