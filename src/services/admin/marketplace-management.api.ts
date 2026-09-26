import { apiClient, type ApiError } from "@/lib/api-client";
import type {
  MarketplaceActivityEvent,
  MarketplaceFacets,
  MarketplaceListingDetail,
  MarketplaceListingRow,
  MarketplaceListQuery,
  MarketplaceStatusCounts,
  Paginated,
} from "@/types/admin";
import type { AdminMarketplaceManagementService } from "./marketplace-management.service";

/**
 * Live /admin/marketplace service backed by AdminMarketplaceController
 * (GET /admin/marketplace, /counts, /facets, /:id, /:id/activity). Read-only;
 * moderation actions live on /admin/products.
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

function queryString(query: MarketplaceListQuery): string {
  const params = new URLSearchParams();
  const set = (key: string, value: string | number | undefined) => {
    if (value === undefined || value === "" || value === "all") return;
    params.set(key, String(value));
  };
  set("q", query.search?.trim());
  set("status", query.status);
  set("visibility", query.visibility);
  set("publication", query.publication);
  set("categoryId", query.categoryId);
  set("campusId", query.campusId);
  set("vendorId", query.vendorId);
  set("stock", query.stock);
  set("sortBy", query.sortBy);
  set("sortDir", query.sortDir);
  set("page", query.page);
  set("limit", query.pageSize);
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export function createApiMarketplaceManagementService(): AdminMarketplaceManagementService {
  return {
    async list(query = {}) {
      const { data, error } = await apiClient.get<BackendPage<MarketplaceListingRow>>(
        `/admin/marketplace${queryString(query)}`
      );
      if (error) fail(error, "Couldn't load listings.");
      const page: Paginated<MarketplaceListingRow> = {
        items: data.items,
        page: data.meta.page,
        pageSize: data.meta.limit,
        total: data.meta.total,
        totalPages: Math.max(1, data.meta.totalPages),
      };
      return page;
    },

    async getById(id) {
      const { data, error } = await apiClient.get<MarketplaceListingDetail>(
        `/admin/marketplace/${id}`
      );
      if (error?.status === 404) return null;
      if (error) fail(error, "Couldn't load the listing.");
      return data;
    },

    async getCounts() {
      const { data, error } = await apiClient.get<MarketplaceStatusCounts>(
        "/admin/marketplace/counts"
      );
      if (error) fail(error, "Couldn't load listing counts.");
      return data;
    },

    async getFacets() {
      const { data, error } = await apiClient.get<MarketplaceFacets>(
        "/admin/marketplace/facets"
      );
      if (error) fail(error, "Couldn't load listing filters.");
      return data;
    },

    async getActivity(id) {
      const { data, error } = await apiClient.get<MarketplaceActivityEvent[]>(
        `/admin/marketplace/${id}/activity`
      );
      if (error) fail(error, "Couldn't load listing activity.");
      return data;
    },
  };
}
