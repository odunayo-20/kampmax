import { apiClient, type ApiError } from "@/lib/api-client";
import type {
  AdminWalletAccount,
  AdminWalletAccountQuery,
  AdminWalletAdjustInput,
  AdminWalletSetStatusInput,
  Paginated,
} from "@/types/admin";

/**
 * Live vendor/customer wallet accounts, backed by AdminWalletsController
 * (GET /admin/wallets/accounts, PATCH .../status, POST .../adjust). Freezing
 * blocks every ledger operation on the wallet server-side; a manual
 * adjustment posts a real ADJUSTMENT ledger entry via WalletsService.adjust.
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
    throw new Error("You don't have permission to manage wallets.");
  }
  throw new Error(error.message || fallback);
}

function queryString(query: AdminWalletAccountQuery): string {
  const params = new URLSearchParams();
  const set = (key: string, value: string | number | null | undefined) => {
    if (value === undefined || value === null || value === "" || value === "all") return;
    params.set(key, String(value));
  };
  set("q", query.search?.trim());
  set("ownerType", query.ownerType);
  set("status", query.status);
  set("sortBy", query.sortBy);
  set("sortDir", query.sortDir);
  set("page", query.page);
  set("limit", query.pageSize);
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export interface AdminWalletAccountsService {
  listAccounts(query?: AdminWalletAccountQuery): Promise<Paginated<AdminWalletAccount>>;
  setStatus(id: string, input: AdminWalletSetStatusInput): Promise<AdminWalletAccount>;
  adjust(id: string, input: AdminWalletAdjustInput): Promise<AdminWalletAccount>;
}

export function createApiWalletAccountsService(): AdminWalletAccountsService {
  return {
    async listAccounts(query = {}) {
      const { data, error } = await apiClient.get<BackendPage<AdminWalletAccount>>(
        `/admin/wallets/accounts${queryString(query)}`
      );
      if (error) fail(error, "Couldn't load wallet accounts.");
      return {
        items: data.items,
        page: data.meta.page,
        pageSize: data.meta.limit,
        total: data.meta.total,
        totalPages: Math.max(1, data.meta.totalPages),
      } satisfies Paginated<AdminWalletAccount>;
    },

    async setStatus(id, input) {
      const { data, error } = await apiClient.patch<AdminWalletSetStatusInput, AdminWalletAccount>(
        `/admin/wallets/accounts/${encodeURIComponent(id)}/status`,
        input
      );
      if (error?.status === 400) {
        throw new Error(error.message || "This wallet's status can't be changed.");
      }
      if (error) fail(error, "Couldn't update the wallet's status.");
      return data;
    },

    async adjust(id, input) {
      const { data, error } = await apiClient.post<AdminWalletAdjustInput, AdminWalletAccount>(
        `/admin/wallets/accounts/${encodeURIComponent(id)}/adjust`,
        input
      );
      if (error?.status === 400) {
        throw new Error(error.message || "This wallet can't be adjusted.");
      }
      if (error) fail(error, "Couldn't adjust the wallet.");
      return data;
    },
  };
}
