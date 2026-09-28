// ============================================================
// REVIEW MANAGEMENT SERVICE (Module 41)
// ============================================================
//
// Read-only admin service over the real review stores. Per the Module 41
// API-contract audit, neither store exposes admin moderation transitions:
//   - Storefront reviews (src/data/reviews.ts) have NO status field and the
//     report list is a read-only array with no triage API.
//   - Profile reviews (src/data/profile-reviews.ts) allow the AUTHOR to
//     create/update/delete/report, but ship no admin moderation surface.
// So this console intentionally implements no mutations — every pipeline
// the backend does not provide is surfaced as an honest gap.
// ============================================================

import type {
  ManagedReviewCounts,
  ManagedReviewDetail,
  ManagedReviewFacets,
  ManagedReviewListQuery,
  ManagedReviewRow,
  ManagedReviewSortField,
  ModerateReviewInput,
  Paginated,
} from "@/types/admin";
import {
  buildReviewDataset,
  computeReviewCounts,
  computeReviewFacets,
  filterReviews,
} from "@/data/admin/review-management";

export interface AdminReviewManagementService {
  /** Backend-search / filter / sort / paginate over real reviews. */
  list(query?: ManagedReviewListQuery): Promise<Paginated<ManagedReviewRow>>;
  /** Detailed operational view of a single review (null when unknown). */
  getById(id: string): Promise<ManagedReviewDetail | null>;
  /** Honest live metrics (reported/needsAttention are 0 — no report store). */
  getCounts(): Promise<ManagedReviewCounts>;
  /** Facet counts derived from real rows. */
  getFacets(): Promise<ManagedReviewFacets>;
  /**
   * Vendors with storefront-received reviews, for the vendor filter.
   * Derives vendor names from the real vendor store.
   */
  getVendorOptions(): Promise<{ id: string; name: string }[]>;
  /** Publishes, hides, flags or removes a review. Mock: in-memory only. */
  moderateReview(id: string, input: ModerateReviewInput): Promise<ManagedReviewDetail>;
}

export function createReviewManagementService(): AdminReviewManagementService {
  return {
    async list(query = {}) {
      const dataset = buildReviewDataset();
      const result = filterReviews(dataset, query);
      return {
        items: result.items,
        total: result.total,
        page: result.page,
        pageSize: Math.max(1, query.pageSize ?? 10),
        totalPages: result.totalPages,
      };
    },

    async getById(id) {
      const { details } = buildReviewDataset();
      return details.get(id) ?? null;
    },

    async getCounts() {
      const { rows } = buildReviewDataset();
      return computeReviewCounts(rows);
    },

    async getFacets() {
      const { rows } = buildReviewDataset();
      return computeReviewFacets(rows);
    },

    async getVendorOptions() {
      const { rows } = buildReviewDataset();
      const { vendors } = computeReviewFacets(rows);
      return vendors.map((v) => ({ id: v.id, name: v.name }));
    },

    async moderateReview(id, input) {
      const { details } = buildReviewDataset();
      const detail = details.get(id);
      if (!detail) throw new Error("Review not found");
      detail.review.status = input.status;
      detail.review.updatedAt = new Date().toISOString();
      detail.statusNote = `Moderated to "${input.status}" in this session only (mock store — not persisted).`;
      return detail;
    },
  };
}

export type { ManagedReviewSortField };