import { apiClient, type ApiError } from "@/lib/api-client";
import type {
  ManagedPayout,
  ManagedPayoutDetail,
  ManagedPayoutFacets,
  ManagedPayoutListQuery,
  ManagedPayoutStatusCounts,
  Paginated,
  ResolvePayoutInput,
} from "@/types/admin";
import type { AdminPayoutManagementService } from "./payout-management.service";

/**
 * Live /admin/payouts service backed by AdminPayoutsController
 * (GET /admin/payouts, /counts, /facets, /:id). Read-only recipient payout
 * ledger derived from the real wallet_transactions table: SETTLEMENT rows
 * (earnings credited to a vendor/freelancer wallet) and WITHDRAWAL rows
 * (wallet debited to a bank account) owned by a vendor or freelancer user.
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
    throw new Error("You don't have permission to view payouts.");
  }
  throw new Error(error.message || fallback);
}

function queryString(query: ManagedPayoutListQuery): string {
  const params = new URLSearchParams();
  const set = (key: string, value: string | number | null | undefined) => {
    if (value === undefined || value === null || value === "" || value === "all") return;
    params.set(key, String(value));
  };
  set("q", query.search?.trim());
  set("status", query.status);
  set("type", query.type);
  set("method", query.method);
  set("sortBy", query.sortBy);
  set("sortDir", query.sortDir);
  set("page", query.page);
  set("limit", query.pageSize);
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export function createApiPayoutManagementService(): AdminPayoutManagementService {
  return {
    async list(query = {}) {
      const { data, error } = await apiClient.get<BackendPage<ManagedPayout>>(
        `/admin/payouts${queryString(query)}`
      );
      if (error) fail(error, "Couldn't load payouts.");
      return {
        items: data.items,
        page: data.meta.page,
        pageSize: data.meta.limit,
        total: data.meta.total,
        totalPages: Math.max(1, data.meta.totalPages),
      } satisfies Paginated<ManagedPayout>;
    },

    async getById(id) {
      const { data, error } = await apiClient.get<ManagedPayoutDetail>(
        `/admin/payouts/${encodeURIComponent(id)}`
      );
      if (error?.status === 404) return null;
      if (error) fail(error, "Couldn't load the payout.");
      return data;
    },

    async getCounts() {
      const { data, error } = await apiClient.get<ManagedPayoutStatusCounts>(
        "/admin/payouts/counts"
      );
      if (error) fail(error, "Couldn't load payout counts.");
      return data;
    },

    async getFacets() {
      const { data, error } = await apiClient.get<ManagedPayoutFacets>(
        "/admin/payouts/facets"
      );
      if (error) fail(error, "Couldn't load payout filters.");
      return data;
    },

    async resolvePayout(id, input) {
      const { data, error } = await apiClient.patch<ResolvePayoutInput, ManagedPayoutDetail>(
        `/admin/payouts/${encodeURIComponent(id)}/resolve`,
        input
      );
      if (error?.status === 400) {
        throw new Error(error.message || "This payout can't be resolved.");
      }
      if (error?.status === 409) {
        throw new Error(error.message || "This payout was already resolved.");
      }
      if (error) fail(error, "Couldn't record the payout outcome.");
      return data;
    },
  };
}
