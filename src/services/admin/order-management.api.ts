import { apiClient, type ApiError } from "@/lib/api-client";
import type {
  ManagedOrder,
  ManagedOrderDetail,
  OrderFacets,
  OrderListQuery,
  OrderStatusCounts,
  Paginated,
} from "@/types/admin";
import type { AdminOrderManagementService } from "./order-management.service";

/**
 * Live /admin/orders service backed by AdminOrdersController
 * (GET /admin/orders, /counts, /facets, /:id; PATCH /:id/cancel, /:id/status,
 * /:id/dispute, /:id/dispute/resolve).
 * Orders are addressed by their order number.
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

function queryString(query: OrderListQuery): string {
  const params = new URLSearchParams();
  const set = (key: string, value: string | number | undefined) => {
    if (value === undefined || value === "" || value === "all") return;
    params.set(key, String(value));
  };
  set("q", query.search?.trim());
  set("status", query.status);
  set("paymentStatus", query.paymentStatus);
  set("fulfillment", query.fulfillment);
  set("campusId", query.campusId);
  set("vendorId", query.vendorId);
  set("sortBy", query.sortBy);
  set("sortDir", query.sortDir);
  set("page", query.page);
  set("limit", query.pageSize);
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export function createApiOrderManagementService(): AdminOrderManagementService {
  return {
    async list(query = {}) {
      const { data, error } = await apiClient.get<BackendPage<ManagedOrder>>(
        `/admin/orders${queryString(query)}`
      );
      if (error) fail(error, "Couldn't load orders.");
      const page: Paginated<ManagedOrder> = {
        items: data.items,
        page: data.meta.page,
        pageSize: data.meta.limit,
        total: data.meta.total,
        totalPages: Math.max(1, data.meta.totalPages),
      };
      return page;
    },

    async getById(id) {
      const { data, error } = await apiClient.get<ManagedOrderDetail>(
        `/admin/orders/${encodeURIComponent(id)}`
      );
      if (error?.status === 404) return null;
      if (error) fail(error, "Couldn't load the order.");
      return data;
    },

    async getCounts() {
      const { data, error } = await apiClient.get<OrderStatusCounts>(
        "/admin/orders/counts"
      );
      if (error) fail(error, "Couldn't load order counts.");
      return data;
    },

    async cancel(id, reason) {
      if (!reason.trim()) throw new Error("A cancellation reason is required.");
      const { data, error } = await apiClient.patch<
        { reason: string },
        ManagedOrderDetail
      >(`/admin/orders/${encodeURIComponent(id)}/cancel`, { reason: reason.trim() });
      if (error) fail(error, "Couldn't cancel the order.");
      return data;
    },

    async advance(id, status, note) {
      const { data, error } = await apiClient.patch<
        { status: string; note?: string },
        ManagedOrderDetail
      >(`/admin/orders/${encodeURIComponent(id)}/status`, {
        status,
        ...(note?.trim() ? { note: note.trim() } : {}),
      });
      if (error) fail(error, "Couldn't update the order.");
      return data;
    },

    async openDispute(id, reason) {
      if (!reason.trim()) throw new Error("A dispute reason is required.");
      const { data, error } = await apiClient.patch<
        { reason: string },
        ManagedOrderDetail
      >(`/admin/orders/${encodeURIComponent(id)}/dispute`, { reason: reason.trim() });
      if (error) fail(error, "Couldn't open the dispute.");
      return data;
    },

    async resolveDispute(id, outcome, note) {
      if (!note.trim()) throw new Error("A ruling note is required.");
      const { data, error } = await apiClient.patch<
        { outcome: string; note: string },
        ManagedOrderDetail
      >(`/admin/orders/${encodeURIComponent(id)}/dispute/resolve`, {
        outcome,
        note: note.trim(),
      });
      if (error) fail(error, "Couldn't resolve the dispute.");
      return data;
    },

    async getFacets() {
      const { data, error } = await apiClient.get<OrderFacets>(
        "/admin/orders/facets"
      );
      if (error) fail(error, "Couldn't load order filters.");
      return data;
    },
  };
}
