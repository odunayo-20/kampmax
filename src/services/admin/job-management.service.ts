// ============================================================
// JOB MANAGEMENT SERVICE CONTRACT (Module 40)
// ============================================================
//
// Read-only admin service over the jobs marketplace. The backend exposes
// no admin moderation transitions and no job-reports store, so this
// console intentionally has no mutations. The live implementation is
// job-management.api.ts; job-management.mock.ts is the old prototype.
// ============================================================

import type {
  ManagedJobActivityEvent,
  ManagedJobDetail,
  ManagedJobFacets,
  ManagedJobListQuery,
  ManagedJobRow,
  ManagedJobStatusCounts,
  ManagedJobSortField,
  Paginated,
} from "@/types/admin";

export interface AdminJobManagementService {
  /** Backend-search / filter / sort / paginate over real jobs. */
  list(query?: ManagedJobListQuery): Promise<Paginated<ManagedJobRow>>;
  /** Detailed operational view of a single job (null when unknown). */
  getById(id: string): Promise<ManagedJobDetail | null>;
  /** Live status metrics (reported is always 0 - no store). */
  getCounts(): Promise<ManagedJobStatusCounts>;
  /** Facet counts derived from real rows. */
  getFacets(): Promise<ManagedJobFacets>;
  /** Job activity timeline (no invented admin events). */
  getActivity(id: string): Promise<ManagedJobActivityEvent[]>;
}

export type { ManagedJobSortField };
