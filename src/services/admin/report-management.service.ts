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
import {
  buildTrustSafetyDataset,
  buildTrustSafetyDetail,
  computeTrustSafetyCounts,
  computeTrustSafetyFacets,
  filterTrustSafetyReports,
} from "@/data/admin/report-management";

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

export function createTrustSafetyService(): AdminTrustSafetyService {
  return {
    async list(query = {}) {
      const dataset = buildTrustSafetyDataset();
      const result = filterTrustSafetyReports(dataset, query);
      return {
        items: result.items,
        total: result.total,
        page: result.page,
        pageSize: Math.max(1, query.pageSize ?? 10),
        totalPages: result.totalPages,
      };
    },

    async getById(id) {
      const dataset = buildTrustSafetyDataset();
      return buildTrustSafetyDetail(dataset, id);
    },

    async getCounts() {
      const { rows } = buildTrustSafetyDataset();
      return computeTrustSafetyCounts(rows);
    },

    async getFacets() {
      const dataset = buildTrustSafetyDataset();
      return computeTrustSafetyFacets(dataset);
    },

    async getReasonOptions() {
      const dataset = buildTrustSafetyDataset();
      const { reasons } = computeTrustSafetyFacets(dataset);
      return reasons.map((r) => ({ reason: r.reason, count: r.count }));
    },

    async setReportStatus(id, input) {
      const dataset = buildTrustSafetyDataset();
      const detail = dataset.details.get(id);
      if (!detail) throw new Error("Report not found");
      if (!detail.resolvable) {
        throw new Error(
          "Review-sourced reports resolve by moderating the review in /admin/reviews, not here."
        );
      }
      detail.status = input.status;
      return detail;
    },
  };
}

export type { TrustSafetySortField };