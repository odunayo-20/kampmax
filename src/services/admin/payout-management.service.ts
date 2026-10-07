import {
  ManagedPayout,
  ManagedPayoutDetail,
  ManagedPayoutFacets,
  ManagedPayoutListQuery,
  ManagedPayoutStatusCounts,
  Paginated,
  ResolvePayoutInput,
} from "@/types/admin";

// ------------------------------------------------------------
// CONTRACT (future NestJS resource: /admin/payouts)
// ------------------------------------------------------------

export interface AdminPayoutManagementService {
  list(query?: ManagedPayoutListQuery): Promise<Paginated<ManagedPayout>>;
  getById(id: string): Promise<ManagedPayoutDetail | null>;
  getCounts(): Promise<ManagedPayoutStatusCounts>;
  getFacets(): Promise<ManagedPayoutFacets>;
  /** Records the real outcome of a pending bank-transfer withdrawal. */
  resolvePayout(id: string, input: ResolvePayoutInput): Promise<ManagedPayoutDetail>;
}