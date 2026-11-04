// ============================================================
// JOB MANAGEMENT SERVICE CONTRACT (Module 40)
// ============================================================
//
// Admin service over the jobs marketplace. It is read-only except for one
// action: taking a posting down (a rejected or rule-breaking one), optionally
// refunding what the employer paid to publish it. User reports and the audited
// look at an application live in job-moderation.service.ts. The live
// implementation is job-management.api.ts; job-management.mock.ts is the old
// prototype.
// ============================================================

import type {
  ManagedJobActivityEvent,
  ManagedJobApplicantRow,
  ManagedJobDetail,
  ManagedJobFacets,
  ManagedJobListQuery,
  ManagedJobRow,
  ManagedJobStatusCounts,
  ManagedJobSortField,
  Paginated,
} from "@/types/admin";

export interface TakeDownJobInput {
  /** Why the posting is being removed; stored on any refund. */
  reason: string;
  /** Give the employer back what they were charged (a rejected posting). */
  refund: boolean;
}

export interface TakeDownJobResult {
  refundedAmount: number;
  restoredFreePostings: number;
}

export interface AdminJobManagementService {
  /** Backend-search / filter / sort / paginate over real jobs. */
  list(query?: ManagedJobListQuery): Promise<Paginated<ManagedJobRow>>;
  /** Detailed operational view of a single job (null when unknown). */
  getById(id: string): Promise<ManagedJobDetail | null>;
  /** Live status metrics (reported = postings with an open user report). */
  getCounts(): Promise<ManagedJobStatusCounts>;
  /** Facet counts derived from real rows. */
  getFacets(): Promise<ManagedJobFacets>;
  /** Job activity timeline (no invented admin events). */
  getActivity(id: string): Promise<ManagedJobActivityEvent[]>;
  /** Who applied (names, status, dates). CVs, notes and answers open through job-moderation.service. */
  getApplicants(
    id: string,
    query?: { page?: number; pageSize?: number }
  ): Promise<Paginated<ManagedJobApplicantRow>>;
  /** Take a posting down, optionally refunding its posting fee (POST /admin/jobs/:id/take-down). */
  takeDown(id: string, input: TakeDownJobInput): Promise<TakeDownJobResult>;
}

export type { ManagedJobSortField };
