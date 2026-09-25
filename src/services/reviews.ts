// ============================================================
// REVIEWS SERVICE
// ============================================================
//
// Two-tier approach:
//
//  TIER 1 — ASYNC BACKEND API (production path)
//    All async functions call apiClient and mirror NestJS /reviews endpoints:
//      POST   /reviews                          → create
//      GET    /reviews/me                       → current user's reviews
//      GET    /reviews/:id                      → single review (auth)
//      PATCH  /reviews/:id                      → update own review
//      DELETE /reviews/:id                      → delete own review
//      GET    /reviews/target/:type/:id         → public reviews for a target
//      GET    /reviews/summary/:type/:id        → rating summary for a target
//
//  TIER 2 — MOCK HELPERS (prototype / offline)
//    Sync helpers backed by in-memory mock data. These remain
//    intact to avoid breaking callers in the UI that haven't been
//    migrated to async yet.
//
// SECURITY: The backend owns review authorship (reviewerId is set
// server-side from the JWT). The frontend never fabricates review
// counts, averages or verification status.

import type { Review, ReviewSummary, ReviewReport, ReviewReportReason, ReviewSortOption } from "@/types";

// Session-local store for reviews/reports created this session. Seeded empty:
// real reviews come only from the backend (Tier 1 above).
const mockReviews: Review[] = [];
const mockReports: ReviewReport[] = [];

function summarize(list: Review[]): ReviewSummary {
  const breakdown: ReviewSummary["breakdown"] = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  for (const r of list) {
    const k = Math.min(5, Math.max(1, Math.round(r.rating))) as 1 | 2 | 3 | 4 | 5;
    breakdown[k] += 1;
  }
  const total = list.length;
  const average = total ? Math.round((list.reduce((a, r) => a + r.rating, 0) / total) * 10) / 10 : 0;
  return {
    averageRating: average,
    totalReviews: total,
    breakdown,
    recommendPercentage: total ? Math.round(((breakdown[4] + breakdown[5]) / total) * 100) : 0,
  };
}
import { apiClient } from "@/lib/api-client";
import type { ApiError } from "@/lib/api-client";

// ── Backend response shapes ──────────────────────────────────

/** Mirrors ReviewTargetType enum on the backend */
export type BackendReviewTargetType =
  | "PRODUCT"
  | "VENDOR"
  | "SERVICE_PROVIDER"
  | "SERVICE_PROVIDER_SERVICE"
  | "FREELANCER_SERVICE"
  | "FREELANCER_PROFILE"
  | "ENGAGEMENT"
  | "SERVICE_BOOKING";

/** Mirrors ReviewStatus enum on the backend */
export type BackendReviewStatus = "PENDING" | "PUBLISHED" | "HIDDEN" | "FLAGGED" | "REMOVED";

export interface BackendReview {
  id: string;
  reviewerId: string;
  reviewerName?: string;
  targetType: BackendReviewTargetType;
  targetId: string;
  rating: number;
  title?: string;
  comment?: string;
  status: BackendReviewStatus;
  verifiedPurchase: boolean;
  vendorReply?: {
    text: string;
    repliedAt: string;
    updatedAt?: string;
  };
  moderatedBy?: string;
  moderationReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BackendRatingSummary {
  average: number;
  total: number;
  distribution: Record<number, number>;
  recommendPercentage: number;
}


export interface BackendPaginatedReviews {
  items: BackendReview[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

// ── DTOs ─────────────────────────────────────────────────────

export interface CreateReviewDto {
  targetType: BackendReviewTargetType;
  targetId: string;
  rating: number;
  title?: string;
  comment?: string;
}

export interface UpdateReviewDto {
  rating?: number;
  title?: string;
  comment?: string;
}

// ═══════════════════════════════════════════════════════════
// ASYNC BACKEND API
// ═══════════════════════════════════════════════════════════

/**
 * Create a new review (authenticated).
 * Endpoint: POST /reviews
 */
export async function createReview(dto: CreateReviewDto): Promise<{
  review: BackendReview | null;
  error: ApiError | null;
}> {
  const { data, error } = await apiClient.post<CreateReviewDto, BackendReview>("/reviews", dto);
  if (error) return { review: null, error };
  return { review: data, error: null };
}

/**
 * List the current authenticated user's reviews.
 * Endpoint: GET /reviews/me
 */
export async function getMyReviews(query: {
  page?: number;
  limit?: number;
} = {}): Promise<{
  reviews: BackendReview[];
  total: number;
  page: number;
  totalPages: number;
  error: ApiError | null;
}> {
  const params = new URLSearchParams();
  if (query.page) params.set("page", String(query.page));
  if (query.limit) params.set("limit", String(query.limit));
  const qs = params.toString();

  const { data, error } = await apiClient.get<BackendPaginatedReviews>(
    `/reviews/me${qs ? `?${qs}` : ""}`
  );
  if (error) return { reviews: [], total: 0, page: 1, totalPages: 1, error };

  return {
    reviews: data.items ?? [],
    total: data.meta?.total ?? 0,
    page: data.meta?.page ?? 1,
    totalPages: data.meta?.totalPages ?? 1,
    error: null,
  };
}

/**
 * Fetch a single review by ID (authenticated).
 * Endpoint: GET /reviews/:id
 */
export async function getReviewById(id: string): Promise<{
  review: BackendReview | null;
  error: ApiError | null;
}> {
  const { data, error } = await apiClient.get<BackendReview>(`/reviews/${id}`);
  if (error) return { review: null, error };
  return { review: data, error: null };
}

/**
 * Update the current user's own review.
 * Endpoint: PATCH /reviews/:id
 */
export async function updateMyReview(
  id: string,
  dto: UpdateReviewDto
): Promise<{ review: BackendReview | null; error: ApiError | null }> {
  const { data, error } = await apiClient.patch<UpdateReviewDto, BackendReview>(
    `/reviews/${id}`,
    dto
  );
  if (error) return { review: null, error };
  return { review: data, error: null };
}

/**
 * Delete the current user's own review.
 * Endpoint: DELETE /reviews/:id
 */
export async function deleteMyReview(id: string): Promise<{
  success: boolean;
  error: ApiError | null;
}> {
  const { error } = await apiClient.delete(`/reviews/${id}`);
  if (error) return { success: false, error };
  return { success: true, error: null };
}

/**
 * List public approved reviews for a target entity.
 * Endpoint: GET /reviews/target/:targetType/:targetId
 */
export async function listPublicReviews(
  targetType: BackendReviewTargetType,
  targetId: string,
  query: { page?: number; limit?: number } = {}
): Promise<{
  reviews: BackendReview[];
  total: number;
  page: number;
  totalPages: number;
  error: ApiError | null;
}> {
  const params = new URLSearchParams();
  if (query.page) params.set("page", String(query.page));
  if (query.limit) params.set("limit", String(query.limit));
  const qs = params.toString();

  const { data, error } = await apiClient.get<BackendPaginatedReviews>(
    `/reviews/target/${targetType}/${targetId}${qs ? `?${qs}` : ""}`
  );
  if (error) return { reviews: [], total: 0, page: 1, totalPages: 1, error };

  return {
    reviews: data.items ?? [],
    total: data.meta?.total ?? 0,
    page: data.meta?.page ?? 1,
    totalPages: data.meta?.totalPages ?? 1,
    error: null,
  };
}

/**
 * Get the rating summary (average, count, distribution, recommend %) for a target.
 * Endpoint: GET /reviews/summary/:targetType/:targetId
 */
export async function getTargetRatingSummary(
  targetType: BackendReviewTargetType,
  targetId: string
): Promise<{ summary: BackendRatingSummary | null; error: ApiError | null }> {
  const { data, error } = await apiClient.get<BackendRatingSummary>(
    `/reviews/summary/${targetType}/${targetId}`
  );
  if (error) return { summary: null, error };
  return { summary: data, error: null };
}

/**
 * Vendor posts a public reply to a review.
 * Endpoint: POST /reviews/:id/vendor-reply
 */
export async function vendorRespondToReview(
  reviewId: string,
  text: string
): Promise<{ review: BackendReview | null; error: ApiError | null }> {
  const { data, error } = await apiClient.post<{ text: string }, BackendReview>(
    `/reviews/${reviewId}/vendor-reply`,
    { text }
  );
  if (error) return { review: null, error };
  return { review: data, error: null };
}

/**
 * Vendor updates their reply on a review.
 * Endpoint: PATCH /reviews/:id/vendor-reply
 */
export async function vendorUpdateReply(
  reviewId: string,
  text: string
): Promise<{ review: BackendReview | null; error: ApiError | null }> {
  const { data, error } = await apiClient.patch<{ text: string }, BackendReview>(
    `/reviews/${reviewId}/vendor-reply`,
    { text }
  );
  if (error) return { review: null, error };
  return { review: data, error: null };
}

/**
 * Vendor deletes their reply from a review.
 * Endpoint: DELETE /reviews/:id/vendor-reply
 */
export async function vendorDeleteReply(
  reviewId: string
): Promise<{ success: boolean; error: ApiError | null }> {
  const { error } = await apiClient.delete(`/reviews/${reviewId}/vendor-reply`);
  if (error) return { success: false, error };
  return { success: true, error: null };
}

/**
 * Report a review for moderation.
 * Endpoint: POST /reviews/:id/report
 */
export async function reportReviewApi(
  reviewId: string,
  reason: string,
  details?: string
): Promise<{ review: BackendReview | null; error: ApiError | null }> {
  const { data, error } = await apiClient.post<{ reason: string; details?: string }, BackendReview>(
    `/reviews/${reviewId}/report`,
    { reason, details }
  );
  if (error) return { review: null, error };
  return { review: data, error: null };
}

/**
 * Create a new review via the real backend API (async).
 * Falls back gracefully on error so UI can use mock locally.
 * Endpoint: POST /reviews
 */
export async function createReviewApi(dto: CreateReviewDto): Promise<{
  review: BackendReview | null;
  error: ApiError | null;
}> {
  return createReview(dto);
}

// ═══════════════════════════════════════════════════════════
// MOCK / PROTOTYPE HELPERS (sync — Tier 2)
// ═══════════════════════════════════════════════════════════

export function getReviewsByVendor(vendorId: string): Review[] {
  return mockReviews.filter((r) => r.target === "vendor" && r.vendorId === vendorId);
}

export function getReviewsByProduct(productId: string): Review[] {
  return mockReviews.filter((r) => r.target === "product" && r.productId === productId);
}

export function getReviewsByUser(userId: string): Review[] {
  return mockReviews.filter((r) => r.userId === userId);
}

export function getAverageRating(vendorId: string): number {
  return summarize(getReviewsByVendor(vendorId)).averageRating;
}

export function getReviewSummary(targetId: string, target: "product" | "vendor"): ReviewSummary {
  return summarize(mockReviews.filter((r) => r.targetId === targetId && r.target === target));
}

export function getAllReviews(targetId?: string, target?: "product" | "vendor"): Review[] {
  if (targetId && target) {
    return mockReviews.filter((r) => r.targetId === targetId && r.target === target);
  }
  return [...mockReviews];
}

export function sortReviews(reviews: Review[], sort: ReviewSortOption): Review[] {
  const sorted = [...reviews];
  switch (sort) {
    case "recent":
      return sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    case "highest":
      return sorted.sort((a, b) => b.rating - a.rating);
    case "lowest":
      return sorted.sort((a, b) => a.rating - b.rating);
    case "helpful":
      return sorted.sort((a, b) => b.helpfulCount - a.helpfulCount);
    case "with_images":
      return sorted.filter((r) => r.images && r.images.length > 0);
    default:
      return sorted;
  }
}

export function addReview(
  review: Omit<Review, "id" | "createdAt" | "verifiedPurchase" | "helpfulCount" | "helpfulBy">
): Review {
  const newReview: Review = {
    ...review,
    id: `r${mockReviews.length + 1}`,
    verifiedPurchase: false,
    helpfulCount: 0,
    helpfulBy: [],
    createdAt: new Date().toISOString(),
  };
  mockReviews.push(newReview);
  return newReview;
}

export function toggleHelpful(reviewId: string, userId: string): Review | undefined {
  const review = mockReviews.find((r) => r.id === reviewId);
  if (!review) return undefined;

  if (!review.helpfulBy) review.helpfulBy = [];

  const idx = review.helpfulBy.indexOf(userId);
  if (idx > -1) {
    review.helpfulBy.splice(idx, 1);
    review.helpfulCount = Math.max(0, review.helpfulCount - 1);
  } else {
    review.helpfulBy.push(userId);
    review.helpfulCount += 1;
  }
  return review;
}

export function hasUserReviewedProduct(userId: string, productId: string): boolean {
  return mockReviews.some(
    (r) => r.userId === userId && r.productId === productId && r.target === "product"
  );
}

export function hasUserReviewedVendor(userId: string, vendorId: string): boolean {
  return mockReviews.some(
    (r) => r.userId === userId && r.vendorId === vendorId && r.target === "vendor"
  );
}

export function reportReview(
  reviewId: string,
  userId: string,
  reason: ReviewReportReason,
  details?: string
): ReviewReport {
  const report: ReviewReport = {
    id: `rr${mockReports.length + 1}`,
    reviewId,
    userId,
    reason,
    details,
    createdAt: new Date().toISOString(),
  };
  mockReports.push(report);

  const review = mockReviews.find((r) => r.id === reviewId);
  if (review) {
    if (!review.reportedBy) review.reportedBy = [];
    review.reportedBy.push(userId);
  }
  return report;
}

export function hasUserReportedReview(reviewId: string, userId: string): boolean {
  return mockReports.some((r) => r.reviewId === reviewId && r.userId === userId);
}
