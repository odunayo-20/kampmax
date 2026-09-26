import { apiClient, type ApiError } from "@/lib/api-client";
import type {
  ManagedProduct,
  ManagedProductDetail,
  Paginated,
  ProductActivityEvent,
  ProductFacets,
  ProductStatusCounts,
} from "@/types/admin";
import type {
  AdminProductManagementService,
  ManagedProductListQuery,
} from "./product-management.service";

/**
 * Live /admin/products service backed by AdminProductsController
 * (GET /admin/products, /counts, /facets, /:id, /:id/activity;
 * PATCH /:id/{approve,reject,suspend,archive,restore}).
 *
 * A rejected listing is a draft carrying a rejection reason; vendor drafts
 * that were never reviewed do not appear here.
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

function queryString(query: ManagedProductListQuery): string {
  const params = new URLSearchParams();
  const set = (key: string, value: string | number | null | undefined) => {
    if (value === undefined || value === null || value === "" || value === "all") return;
    params.set(key, String(value));
  };
  set("q", query.search?.trim());
  set("status", query.status);
  set("categoryId", query.categoryId);
  set("campusId", query.campusId);
  set("vendorId", query.vendorId);
  set("priceMin", query.priceMin);
  set("priceMax", query.priceMax);
  if (query.stock && query.stock !== "any") set("stock", query.stock);
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
): Promise<ManagedProduct> {
  const { data, error } = await apiClient.patch<
    Record<string, string>,
    ManagedProduct
  >(`/admin/products/${id}/${action}`, body);
  if (error) fail(error, fallback);
  return data;
}

export function createApiProductManagementService(): AdminProductManagementService {
  return {
    async list(query = {}) {
      const { data, error } = await apiClient.get<BackendPage<ManagedProduct>>(
        `/admin/products${queryString(query)}`
      );
      if (error) fail(error, "Couldn't load products.");
      const page: Paginated<ManagedProduct> = {
        items: data.items,
        page: data.meta.page,
        pageSize: data.meta.limit,
        total: data.meta.total,
        totalPages: Math.max(1, data.meta.totalPages),
      };
      return page;
    },

    async getById(id) {
      const { data, error } = await apiClient.get<ManagedProductDetail>(
        `/admin/products/${id}`
      );
      if (error?.status === 404) return null;
      if (error) fail(error, "Couldn't load the product.");
      return data;
    },

    async getCounts() {
      const { data, error } = await apiClient.get<ProductStatusCounts>(
        "/admin/products/counts"
      );
      if (error) fail(error, "Couldn't load product counts.");
      return data;
    },

    async getFacets() {
      const { data, error } = await apiClient.get<ProductFacets>(
        "/admin/products/facets"
      );
      if (error) fail(error, "Couldn't load product filters.");
      return data;
    },

    async getActivity(id) {
      const { data, error } = await apiClient.get<ProductActivityEvent[]>(
        `/admin/products/${id}/activity`
      );
      if (error) fail(error, "Couldn't load product activity.");
      return data;
    },

    approve: (id) => patch(id, "approve", {}, "Couldn't approve the listing."),
    async reject(id, reason) {
      if (!reason.trim()) throw new Error("A rejection reason is required.");
      return patch(id, "reject", { reason: reason.trim() }, "Couldn't reject the listing.");
    },
    async suspend(id, reason) {
      if (!reason.trim()) throw new Error("A suspension reason is required.");
      return patch(id, "suspend", { reason: reason.trim() }, "Couldn't suspend the listing.");
    },
    archive: (id) => patch(id, "archive", {}, "Couldn't archive the listing."),
    restore: (id) => patch(id, "restore", {}, "Couldn't restore the listing."),
  };
}
