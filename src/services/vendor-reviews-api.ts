import { apiClient, type ApiError } from "@/lib/api-client";
import type { Review, ReviewReportReason } from "@/types";
import type {
  VendorReviewCounts,
  VendorReviewQuery,
  VendorReviewSummary,
  VendorReviewsPage,
} from "@/types/vendor-reviews";

// ============================================================
// VENDOR REVIEWS — LIVE API LAYER
// ============================================================
//   GET    /reviews/vendor                → reviews about the store + its products
//   GET    /reviews/vendor/summary        → rating summary + response counts
//   GET    /reviews/:id                   → single review
//   POST   /reviews/:id/vendor-reply      { text }
//   PATCH  /reviews/:id/vendor-reply      { text }
//   DELETE /reviews/:id/vendor-reply
//   POST   /reviews/:id/report            { reason, details? }
//
// Vendor identity and ownership are enforced by the backend (JWT-derived).

type BackendTargetType = "PRODUCT" | "VENDOR" | string;

interface BackendReview {
  id: string;
  reviewerId: string;
  reviewerName?: string;
  targetType: BackendTargetType;
  targetId: string;
  rating: number;
  title?: string;
  comment?: string;
  status: string;
  verifiedPurchase: boolean;
  vendorReply?: { text: string; repliedAt: string; updatedAt?: string };
  productTitle?: string;
  createdAt: string;
  updatedAt?: string;
}

interface BackendPage<T> {
  items: T[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

interface BackendSummary {
  average: number;
  total: number;
  distribution: Record<number, number>;
  recommendPercentage: number;
  answered: number;
  unanswered: number;
  reported: number;
}

async function unwrap<T>(
  request: Promise<{ data: T; error: ApiError | null }>
): Promise<T> {
  const { data, error } = await request;
  if (error) throw error;
  return data;
}

export function mapBackendReview(raw: BackendReview): Review {
  const isProduct = raw.targetType === "PRODUCT";
  return {
    id: raw.id,
    targetId: raw.targetId,
    target: isProduct ? "product" : "vendor",
    userId: raw.reviewerId,
    authorName: raw.reviewerName,
    productTitle: raw.productTitle,
    rating: raw.rating,
    title: raw.title,
    comment: raw.comment ?? "",
    verifiedPurchase: raw.verifiedPurchase,
    helpfulCount: 0,
    reportedBy: raw.status === "FLAGGED" ? ["reported"] : undefined,
    vendorResponse: raw.vendorReply
      ? { text: raw.vendorReply.text, createdAt: raw.vendorReply.repliedAt }
      : undefined,
    productId: isProduct ? raw.targetId : undefined,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  };
}

// ── Fetchers ─────────────────────────────────────────────────

export async function fetchVendorReviews(
  query: VendorReviewQuery = {}
): Promise<VendorReviewsPage<Review>> {
  const params = new URLSearchParams();
  if (query.search?.trim()) params.set("search", query.search.trim());
  if (query.scope && query.scope !== "all") params.set("scope", query.scope);
  if (query.ratingBand && query.ratingBand !== "all") params.set("ratingBand", query.ratingBand);
  if (query.star) params.set("star", String(query.star));
  if (query.responseStatus && query.responseStatus !== "all") {
    params.set("responseStatus", query.responseStatus);
  }
  if (query.sort && query.sort !== "helpful") params.set("sort", query.sort);
  params.set("page", String(query.page ?? 1));
  params.set("limit", String(query.pageSize ?? 10));

  const page = await unwrap(apiClient.get<BackendPage<BackendReview>>(`/reviews/vendor?${params}`));
  return {
    items: page.items.map(mapBackendReview),
    total: page.meta.total,
    page: page.meta.page,
    pageSize: page.meta.limit,
    totalPages: Math.max(1, page.meta.totalPages),
  };
}

async function fetchBackendSummary(): Promise<BackendSummary> {
  return unwrap(apiClient.get<BackendSummary>("/reviews/vendor/summary"));
}

export async function fetchVendorReviewSummary(): Promise<VendorReviewSummary> {
  const s = await fetchBackendSummary();
  return {
    averageRating: s.average,
    totalReviews: s.total,
    breakdown: {
      5: s.distribution[5] ?? 0,
      4: s.distribution[4] ?? 0,
      3: s.distribution[3] ?? 0,
      2: s.distribution[2] ?? 0,
      1: s.distribution[1] ?? 0,
    },
    recommendPercentage: s.recommendPercentage,
  };
}

export async function fetchVendorReviewCounts(): Promise<VendorReviewCounts> {
  const s = await fetchBackendSummary();
  return {
    all: s.total,
    answered: s.answered,
    unanswered: s.unanswered,
    withImages: 0,
    reported: s.reported,
  };
}

export async function fetchVendorReview(id: string): Promise<Review> {
  const raw = await unwrap(apiClient.get<BackendReview>(`/reviews/${id}`));
  return mapBackendReview(raw);
}

// ── Mutations ────────────────────────────────────────────────

export async function postVendorReply(reviewId: string, text: string): Promise<void> {
  await unwrap(apiClient.post<{ text: string }, unknown>(`/reviews/${reviewId}/vendor-reply`, { text }));
}

export async function patchVendorReply(reviewId: string, text: string): Promise<void> {
  await unwrap(apiClient.patch<{ text: string }, unknown>(`/reviews/${reviewId}/vendor-reply`, { text }));
}

export async function removeVendorReply(reviewId: string): Promise<void> {
  await unwrap(apiClient.delete<void>(`/reviews/${reviewId}/vendor-reply`));
}

export async function reportReview(
  reviewId: string,
  reason: ReviewReportReason,
  details?: string
): Promise<void> {
  await unwrap(
    apiClient.post<{ reason: string; details?: string }, unknown>(`/reviews/${reviewId}/report`, {
      reason,
      details,
    })
  );
}
