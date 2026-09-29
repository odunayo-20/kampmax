import { apiClient, type ApiError } from "@/lib/api-client";
import type {
  ManagedCustomerWithdrawal,
  ManagedCustomerWithdrawalDetail,
  ManagedCustomerWithdrawalListQuery,
  ManagedCustomerWithdrawalStatusCounts,
  Paginated,
  ResolveCustomerWithdrawalInput,
} from "@/types/admin";

/**
 * Live /admin/withdrawals service backed by AdminWithdrawalsController
 * (GET /admin/withdrawals, /counts, /:id, PATCH /:id/resolve). Customer
 * wallet withdrawals to a bank account — the WITHDRAWAL-type slice
 * AdminPayoutsService (/admin/payouts) deliberately excludes.
 */

export interface AdminCustomerWithdrawalManagementService {
  list(query?: ManagedCustomerWithdrawalListQuery): Promise<Paginated<ManagedCustomerWithdrawal>>;
  getById(id: string): Promise<ManagedCustomerWithdrawalDetail | null>;
  getCounts(): Promise<ManagedCustomerWithdrawalStatusCounts>;
  resolve(
    id: string,
    input: ResolveCustomerWithdrawalInput
  ): Promise<ManagedCustomerWithdrawalDetail>;
}

interface BackendPage<T> {
  items: T[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

function fail(error: ApiError, fallback: string): never {
  if (error.status === 401) {
    throw new Error("You're signed out. Sign in again to continue.");
  }
  if (error.status === 403) {
    throw new Error("You don't have permission to view withdrawals.");
  }
  throw new Error(error.message || fallback);
}

function queryString(query: ManagedCustomerWithdrawalListQuery): string {
  const params = new URLSearchParams();
  const set = (key: string, value: string | number | null | undefined) => {
    if (value === undefined || value === null || value === "" || value === "all") return;
    params.set(key, String(value));
  };
  set("q", query.search?.trim());
  set("status", query.status);
  set("sortBy", query.sortBy);
  set("sortDir", query.sortDir);
  set("page", query.page);
  set("limit", query.pageSize);
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export function createApiWithdrawalManagementService(): AdminCustomerWithdrawalManagementService {
  return {
    async list(query = {}) {
      const { data, error } = await apiClient.get<BackendPage<ManagedCustomerWithdrawal>>(
        `/admin/withdrawals${queryString(query)}`
      );
      if (error) fail(error, "Couldn't load withdrawals.");
      return {
        items: data.items,
        page: data.meta.page,
        pageSize: data.meta.limit,
        total: data.meta.total,
        totalPages: Math.max(1, data.meta.totalPages),
      } satisfies Paginated<ManagedCustomerWithdrawal>;
    },

    async getById(id) {
      const { data, error } = await apiClient.get<ManagedCustomerWithdrawalDetail>(
        `/admin/withdrawals/${encodeURIComponent(id)}`
      );
      if (error?.status === 404) return null;
      if (error) fail(error, "Couldn't load the withdrawal.");
      return data;
    },

    async getCounts() {
      const { data, error } = await apiClient.get<ManagedCustomerWithdrawalStatusCounts>(
        "/admin/withdrawals/counts"
      );
      if (error) fail(error, "Couldn't load withdrawal counts.");
      return data;
    },

    async resolve(id, input) {
      const { data, error } = await apiClient.patch<
        ResolveCustomerWithdrawalInput,
        ManagedCustomerWithdrawalDetail
      >(`/admin/withdrawals/${encodeURIComponent(id)}/resolve`, input);
      if (error?.status === 400) {
        throw new Error(error.message || "This withdrawal can't be resolved.");
      }
      if (error) fail(error, "Couldn't record the withdrawal outcome.");
      return data;
    },
  };
}
