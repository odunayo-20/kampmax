import { apiClient, type ApiError } from "@/lib/api-client";
import type {
  ManagedTransaction,
  ManagedTransactionDetail,
  ManagedTransactionFacets,
  ManagedTransactionListQuery,
  ManagedTransactionStatusCounts,
  Paginated,
} from "@/types/admin";
import type { AdminTransactionManagementService } from "./transaction-management.service";

/**
 * Live /admin/transactions service backed by AdminTransactionsController
 * (GET /admin/transactions, /counts, /facets, /:id). Read-only ledger of
 * order payments, wallet funding and refunds.
 */

interface BackendPage<T> {
  items: T[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

/** Backend page-size ceiling (PaginationDto). */
const MAX_LIMIT = 100;
/** Safety cap so an export can never loop unbounded. */
const EXPORT_ROW_CAP = 10_000;

function fail(error: ApiError, fallback: string): never {
  if (error.status === 401) {
    throw new Error("You're signed out. Sign in again to continue.");
  }
  if (error.status === 403) {
    throw new Error("You don't have permission to view transactions.");
  }
  throw new Error(error.message || fallback);
}

function queryString(query: ManagedTransactionListQuery): string {
  const params = new URLSearchParams();
  const set = (key: string, value: string | number | null | undefined) => {
    if (value === undefined || value === null || value === "" || value === "all") return;
    params.set(key, String(value));
  };
  set("q", query.search?.trim());
  set("status", query.status);
  set("type", query.type);
  set("method", query.method);
  set("dateFrom", query.dateFrom);
  set("dateTo", query.dateTo);
  set("sortBy", query.sortBy);
  set("sortDir", query.sortDir);
  set("page", query.page);
  set("limit", query.pageSize);
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

async function fetchPage(
  query: ManagedTransactionListQuery
): Promise<Paginated<ManagedTransaction>> {
  const { data, error } = await apiClient.get<BackendPage<ManagedTransaction>>(
    `/admin/transactions${queryString(query)}`
  );
  if (error) fail(error, "Couldn't load transactions.");
  return {
    items: data.items,
    page: data.meta.page,
    pageSize: data.meta.limit,
    total: data.meta.total,
    totalPages: Math.max(1, data.meta.totalPages),
  };
}

export function createApiTransactionManagementService(): AdminTransactionManagementService {
  return {
    list: (query = {}) => fetchPage(query),

    async listAll(query = {}) {
      const rows: ManagedTransaction[] = [];
      let page = 1;
      for (;;) {
        const res = await fetchPage({ ...query, page, pageSize: MAX_LIMIT });
        rows.push(...res.items);
        if (page >= res.totalPages || rows.length >= EXPORT_ROW_CAP) break;
        page += 1;
      }
      return rows.slice(0, EXPORT_ROW_CAP);
    },

    async getById(id) {
      const { data, error } = await apiClient.get<ManagedTransactionDetail>(
        `/admin/transactions/${encodeURIComponent(id)}`
      );
      if (error?.status === 404) return null;
      if (error) fail(error, "Couldn't load the transaction.");
      return data;
    },

    async getCounts() {
      const { data, error } = await apiClient.get<ManagedTransactionStatusCounts>(
        "/admin/transactions/counts"
      );
      if (error) fail(error, "Couldn't load transaction counts.");
      return data;
    },

    async getFacets() {
      const { data, error } = await apiClient.get<ManagedTransactionFacets>(
        "/admin/transactions/facets"
      );
      if (error) fail(error, "Couldn't load transaction filters.");
      return data;
    },
  };
}
