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

export type { ManagedReviewSortField };