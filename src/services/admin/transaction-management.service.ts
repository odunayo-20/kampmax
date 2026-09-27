import {
  ManagedTransaction,
  ManagedTransactionDetail,
  ManagedTransactionFacets,
  ManagedTransactionListQuery,
  ManagedTransactionStatusCounts,
  Paginated,
} from "@/types/admin";
import { apiDelay, paginate } from "@/lib/admin/api";
import {
  computeTransactionCounts,
  filterTransactionRows,
  sortTransactionRows,
  transactionDataset,
  transactionFacets,
} from "@/data/admin/transaction-management";

// ------------------------------------------------------------
// CONTRACT (future NestJS resource: /admin/transactions)
// ------------------------------------------------------------

export interface AdminTransactionManagementService {
  list(query?: ManagedTransactionListQuery): Promise<Paginated<ManagedTransaction>>;
  /** Every row matching the query (ignores pagination) — used for CSV export. */
  listAll(query?: ManagedTransactionListQuery): Promise<ManagedTransaction[]>;
  getById(id: string): Promise<ManagedTransactionDetail | null>;
  getCounts(): Promise<ManagedTransactionStatusCounts>;
  getFacets(): Promise<ManagedTransactionFacets>;
}

// ------------------------------------------------------------
// MOCK IMPLEMENTATION
//
// Derives the ledger once from the immutable order + wallet stores
// (~12 rows), so nothing can drift from the owning stores.
// The console is intentionally read-only:
//   - there is no actor/ctx parameter because financial records are
//     platform-scoped. Access is gatekept at the nav layer: only
//     ADMIN/SUPER_ADMIN roles are granted the "transactions" section,
//     so CAMPUS_ADMIN operators never reach this service (defense in
//     depth via UI permissions, mirroring the backend boundary).
//   - there is no mutation surface because the prototype backend has no
//     transaction-level actions (refunds live at order/wallet level).
// ------------------------------------------------------------

export function createTransactionManagementService(): AdminTransactionManagementService {
  return {
    async list(query) {
      await apiDelay();
      const rows = sortTransactionRows(
        filterTransactionRows(transactionDataset.rows, query ?? {}),
        query?.sortBy,
        query?.sortDir ?? "desc"
      );
      return paginate(rows, query ?? {});
    },

    async listAll(query) {
      await apiDelay();
      return sortTransactionRows(
        filterTransactionRows(transactionDataset.rows, query ?? {}),
        query?.sortBy,
        query?.sortDir ?? "desc"
      );
    },

    async getById(id) {
      await apiDelay();
      return transactionDataset.byId.get(id) ?? null;
    },

    async getCounts() {
      await apiDelay(60);
      return computeTransactionCounts(transactionDataset.rows);
    },

    async getFacets() {
      await apiDelay(60);
      return transactionFacets(transactionDataset.rows);
    },
  };
}