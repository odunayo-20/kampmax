import { apiClient, type ApiError } from "@/lib/api-client";
import type {
  FinanceOverview,
  FinanceTxnQuery,
  ManagedFinanceTxn,
  Paginated,
} from "@/types/admin";

/**
 * Live /admin/wallet ledger + overview, backed by AdminWalletsController
 * (GET /admin/wallets/overview, /transactions) — every wallet_transactions
 * row across the platform, vendor and customer pools, plus the funds
 * overview derived from orders, refunds and withdrawals.
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
    throw new Error("You don't have permission to view wallets.");
  }
  throw new Error(error.message || fallback);
}

function queryString(query: FinanceTxnQuery): string {
  const params = new URLSearchParams();
  const set = (key: string, value: string | number | null | undefined) => {
    if (value === undefined || value === null || value === "" || value === "all") return;
    params.set(key, String(value));
  };
  set("q", query.search?.trim());
  set("type", query.type);
  set("status", query.status);
  set("pool", query.pool);
  set("sortBy", query.sortBy);
  set("sortDir", query.sortDir);
  set("page", query.page);
  set("limit", query.pageSize);
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export interface AdminWalletLedgerService {
  getOverview(): Promise<FinanceOverview>;
  listTransactions(query?: FinanceTxnQuery): Promise<Paginated<ManagedFinanceTxn>>;
}

export function createApiWalletLedgerService(): AdminWalletLedgerService {
  return {
    async getOverview() {
      const { data, error } = await apiClient.get<FinanceOverview>("/admin/wallets/overview");
      if (error) fail(error, "Couldn't load the wallet overview.");
      return data;
    },

    async listTransactions(query = {}) {
      const { data, error } = await apiClient.get<BackendPage<ManagedFinanceTxn>>(
        `/admin/wallets/transactions${queryString(query)}`
      );
      if (error) fail(error, "Couldn't load wallet transactions.");
      return {
        items: data.items,
        page: data.meta.page,
        pageSize: data.meta.limit,
        total: data.meta.total,
        totalPages: Math.max(1, data.meta.totalPages),
      } satisfies Paginated<ManagedFinanceTxn>;
    },
  };
}
