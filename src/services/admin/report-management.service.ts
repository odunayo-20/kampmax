// ============================================================
// TRUST & SAFETY SERVICE (Module 42)
// ============================================================
//
// Read-only admin service over the real report stores. Per the Module 42
// API-contract audit, no Kampmax store exposes report-level triage:
//   - Storefront review reports (data/reviews.ts reviewReports) are a
//     in-memory array with no admin mutation API.
//   - Profile review reports (data/profile-reviews.ts) are author-facing
//     only; the store ships no review-report triage surface.
//   - Campus post reports (data/posts.ts reportedPosts) are author-facing
//     only; the post store ships no moderation transitions.
// So this console intentionally implements no mutations — assignment,
// status changes, severity, escalation, notes and history are all honest
// gaps documented in MODULE-42-BACKEND-GAPS.md.
// ============================================================

import type {
  TrustSafetyReportCounts,
  TrustSafetyReportDetail,
  TrustSafetyReportFacets,
  TrustSafetyReportListQuery,
  TrustSafetyReportRow,
  TrustSafetySortField,
  Paginated,
  UpdateSafetyReportStatusInput,
} from "@/types/admin";

export interface AdminTrustSafetyService {
  /** Backend-search / filter / sort / paginate over real reports. */
  list(query?: TrustSafetyReportListQuery): Promise<Paginated<TrustSafetyReportRow>>;
  /** Detailed operational view of a single report (null when unknown). */
  getById(id: string): Promise<TrustSafetyReportDetail | null>;
  /** Honest live metrics derived from real report rows. */
  getCounts(): Promise<TrustSafetyReportCounts>;
  /** Facet counts derived from real rows. */
  getFacets(): Promise<TrustSafetyReportFacets>;
  /** Distinct reason values present in real rows, for the reason filter. */
  getReasonOptions(): Promise<{ reason: string; count: number }[]>;
  /**
   * Moves a campus-post report through review. Review-sourced reports have
   * no equivalent here — resolving one means moderating the review itself
   * in the /admin/reviews console.
   */
  setReportStatus(id: string, input: UpdateSafetyReportStatusInput): Promise<TrustSafetyReportDetail>;
}

export type { TrustSafetySortField };