import {
  ManagedTransaction,
  ManagedTransactionDetail,
  ManagedTransactionFacets,
  ManagedTransactionListQuery,
  ManagedTransactionStatusCounts,
  Paginated,
} from "@/types/admin";

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