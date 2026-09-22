import { apiClient } from "@/lib/api-client";
import { getCurrentUser, getVendorByUserId, getUserById } from "@/services/users";
import { getVendorAccess, getVendorPermissions } from "@/services/vendor-dashboard";
import { VENDOR_DASHBOARD_GATE } from "@/types/vendor-dashboard";
import { reviews as mockReviews, reviewReports as mockReports } from "@/data/reviews";
import type { Review, ReviewReport, ReviewReportReason } from "@/types";
import type {
  VendorReviewQuery,
  VendorReviewsPage,
  VendorReviewCounts,
  VendorReviewSummary,
  VendorReviewResult,
  VendorReviewResultCode,
  VendorReviewPermissionKey,
  VendorReviewPermissions,
  VendorReviewReportInput,
} from "@/types/vendor-reviews";
import { VENDOR_REVIEW_SORT } from "@/types/vendor-reviews";
import { getProducts } from "@/services/products";

// ============================================================
// VENDOR REVIEWS SERVICE LAYER  (Module 13)
// ============================================================
//
// Maps 1:1 to a future backend API:
//   GET    /vendor/reviews                           → list (search/filter/page)
//   GET    /vendor/reviews/counts                    → response/image/report counts
//   GET    /vendor/reviews/summary                   → backend-computed summary
//   POST   /vendor/reviews/{id}/respond      { text }
//   PATCH  /vendor/reviews/{id}/response     { text }
//   DELETE /vendor/reviews/{id}/response
//   POST   /vendor/reviews/{id}/report       { reason, details? }
//
// Reads/writes the SAME review store the public storefront uses, so the two
// surfaces never diverge. Vendors may respond to and report reviews they
// received, but can never delete/hide a review or change its rating/content —
// those are backend-guarded.

const RESPONSE_MAX = 500;
const REPORT_DETAILS_MAX = 300;

// ── Ownership / access ───────────────────────────────────────

function ownerVendorId(): string | null {
  const user = getCurrentUser();
  const vendor = getVendorByUserId(user.id);
  const access = getVendorAccess();
  if (!vendor || !access.canUseDashboard || access.kind !== VENDOR_DASHBOARD_GATE.APPROVED) {
    return null;
  }
  return vendor.id;
}

export function getVendorReviewPermissions(): VendorReviewPermissions {
  const base = getVendorPermissions();
  return {
    "reviews.view": base.canManageReviews,
    "reviews.respond": base.canManageReviews,
    "reviews.report": base.canManageReviews,
  } satisfies Record<VendorReviewPermissionKey, boolean>;
}

function ownedReviews(): Review[] {
  const vendorId = ownerVendorId();
  if (!vendorId) return [];
  return mockReviews.filter((r) => r.vendorId === vendorId);
}

function fail(code: VendorReviewResultCode, error: string): VendorReviewResult {
  return { ok: false, code, error };
}

/** Returns the review plus whether the authenticated vendor owns it. */
function locateReview(reviewId: string): { review?: Review; owned: boolean } {
  const vendorId = ownerVendorId();
  const review = mockReviews.find((r) => r.id === reviewId);
  if (!review) return { owned: false };
  return { review, owned: Boolean(vendorId) && review.vendorId === vendorId };
}

// ── List / counts / summary ─────────────────────────────────

export function listVendorReviews(query: VendorReviewQuery = {}): VendorReviewsPage<Review> {
  const {
    search = "",
    scope = "all",
    ratingBand = "all",
    star,
    responseStatus = "all",
    sort = VENDOR_REVIEW_SORT.NEWEST,
    page = 1,
    pageSize = 10,
  } = query;
  const normPage = Math.max(1, Math.floor(page));
  const normSize = Math.max(1, Math.floor(pageSize));

  let items = ownedReviews();

  if (scope !== "all") items = items.filter((r) => r.target === scope);

  if (ratingBand === "positive") items = items.filter((r) => r.rating >= 4);
  else if (ratingBand === "neutral") items = items.filter((r) => r.rating === 3);
  else if (ratingBand === "negative") items = items.filter((r) => r.rating <= 2);

  if (star !== undefined) items = items.filter((r) => r.rating === star);

  if (responseStatus === "answered") items = items.filter((r) => Boolean(r.vendorResponse));
  else if (responseStatus === "unanswered") items = items.filter((r) => !r.vendorResponse);

  if (search.trim()) {
    const q = search.toLowerCase();
    items = items.filter((r) => {
      const customerName = getUserById(r.userId)?.name ?? "";
      return [r.title ?? "", r.comment, customerName].join(" ").toLowerCase().includes(q);
    });
  }

  if (sort === VENDOR_REVIEW_SORT.OLDEST) items = [...items].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  else if (sort === VENDOR_REVIEW_SORT.RATING_DESC) items = [...items].sort((a, b) => b.rating - a.rating);
  else if (sort === VENDOR_REVIEW_SORT.RATING_ASC) items = [...items].sort((a, b) => a.rating - b.rating);
  else if (sort === VENDOR_REVIEW_SORT.HELPFUL) items = [...items].sort((a, b) => b.helpfulCount - a.helpfulCount);
  else items = [...items].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / normSize));
  const safePage = Math.min(normPage, totalPages);
  const start = (safePage - 1) * normSize;

  return {
    items: items.slice(start, start + normSize),
    total,
    page: safePage,
    pageSize: normSize,
    totalPages,
  };
}

export function getVendorReviewCounts(): VendorReviewCounts {
  const items = ownedReviews();
  const counts: VendorReviewCounts = {
    all: items.length,
    answered: 0,
    unanswered: 0,
    withImages: 0,
    reported: 0,
  };
  for (const r of items) {
    if (r.vendorResponse) counts.answered += 1;
    else counts.unanswered += 1;
    if (r.images && r.images.length > 0) counts.withImages += 1;
    if (r.reportedBy && r.reportedBy.length > 0) counts.reported += 1;
  }
  return counts;
}

export function getVendorReviewSummary(): VendorReviewSummary {
  const items = ownedReviews();
  const total = items.length;
  const breakdown: VendorReviewSummary["breakdown"] = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  let sum = 0;
  for (const r of items) {
    const rating = Math.min(5, Math.max(1, r.rating)) as keyof typeof breakdown;
    breakdown[rating] += 1;
    sum += rating;
  }
  const average = total > 0 ? Math.round((sum / total) * 10) / 10 : 0;
  const highRatings = breakdown[4] + breakdown[5];
  const recommendPercentage = total > 0 ? Math.round((highRatings / total) * 100) : 0;
  return { averageRating: average, totalReviews: total, breakdown, recommendPercentage };
}
// ── Single review (detail page) ──────────────────────────────

export function getVendorReviewById(reviewId: string): { review: Review; productTitle?: string } | null {
  const { review, owned } = locateReview(reviewId);
  if (!review || !owned) return null;
  let productTitle: string | undefined;
  if (review.target === "product" && review.productId) {
    productTitle = getProducts().find((p) => p.id === review.productId)?.title;
  }
  return { review, productTitle };
}

// ── Response management ──────────────────────────────────────

export function respondToReview(reviewId: string, text: string): VendorReviewResult {
  if (!ownerVendorId()) return fail("forbidden", "You don't have an approved vendor account.");
  const { review, owned } = locateReview(reviewId);
  if (!review) return fail("not_found", "Review not found.");
  if (!owned) return fail("forbidden", "You can only respond to reviews about your own store.");
  const trimmed = text.trim();
  if (!trimmed) return fail("invalid_payload", "Response cannot be empty.");
  if (trimmed.length > RESPONSE_MAX) return fail("invalid_payload", `Response cannot exceed ${RESPONSE_MAX} characters.`);
  if (review.vendorResponse) return fail("already_responded", "This review already has a response.");

  review.vendorResponse = { text: trimmed, createdAt: new Date().toISOString() };
  review.updatedAt = new Date().toISOString();
  return { ok: true, code: "ok", review };
}

export function updateReviewResponse(reviewId: string, text: string): VendorReviewResult {
  if (!ownerVendorId()) return fail("forbidden", "You don't have an approved vendor account.");
  const { review, owned } = locateReview(reviewId);
  if (!review) return fail("not_found", "Review not found.");
  if (!owned) return fail("forbidden", "You can only edit responses on reviews about your own store.");
  if (!review.vendorResponse) return fail("no_response", "This review has no response to edit.");
  const trimmed = text.trim();
  if (!trimmed) return fail("invalid_payload", "Response cannot be empty.");
  if (trimmed.length > RESPONSE_MAX) return fail("invalid_payload", `Response cannot exceed ${RESPONSE_MAX} characters.`);

  review.vendorResponse = { text: trimmed, createdAt: review.vendorResponse.createdAt };
  review.updatedAt = new Date().toISOString();
  return { ok: true, code: "ok", review };
}

export function deleteReviewResponse(reviewId: string): VendorReviewResult {
  if (!ownerVendorId()) return fail("forbidden", "You don't have an approved vendor account.");
  const { review, owned } = locateReview(reviewId);
  if (!review) return fail("not_found", "Review not found.");
  if (!owned) return fail("forbidden", "You can only delete responses on reviews about your own store.");
  if (!review.vendorResponse) return fail("no_response", "This review has no response to delete.");

  delete review.vendorResponse;
  review.updatedAt = new Date().toISOString();
  return { ok: true, code: "ok", review };
}

// ── Reporting ────────────────────────────────────────────────

export function reportVendorReview(reviewId: string, input: VendorReviewReportInput): VendorReviewResult {
  if (!ownerVendorId()) return fail("forbidden", "You don't have an approved vendor account.");
  const { review, owned } = locateReview(reviewId);
  if (!review) return fail("not_found", "Review not found.");
  if (!owned) return fail("forbidden", "You can only report reviews about your own store.");

  const validReasons: ReviewReportReason[] = ["spam", "fake", "inappropriate", "offensive", "irrelevant", "other"];
  if (!validReasons.includes(input.reason)) return fail("invalid_payload", "A valid report reason is required.");
  const details = input.details?.trim();
  if (details && details.length > REPORT_DETAILS_MAX) {
    return fail("invalid_payload", `Report details cannot exceed ${REPORT_DETAILS_MAX} characters.`);
  }

  const already = review.reportedBy?.includes(getCurrentUser().id);
  if (already) return fail("already_reported", "You have already reported this review.");

  const report: ReviewReport = {
    id: `rr-v-${mockReports.length + 1}`,
    reviewId,
    userId: getCurrentUser().id,
    reason: input.reason,
    details: details || undefined,
    createdAt: new Date().toISOString(),
  };
  mockReports.push(report);
  if (!review.reportedBy) review.reportedBy = [];
  review.reportedBy.push(getCurrentUser().id);

  return { ok: true, code: "ok", review, report };
}