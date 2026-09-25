"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { targetReviewKeys } from "@/lib/query-keys";
import {
  createReview,
  getMyReviews,
  getTargetRatingSummary,
  listPublicReviews,
  reportReviewApi,
  type BackendReviewTargetType,
} from "@/services/reviews";
import { mapBackendReview } from "@/services/vendor-reviews-api";
import type { Review, ReviewSummary } from "@/types";

const STALE_MS = 30_000;

export type ReviewTargetKind = "product" | "vendor";

const TARGET_TYPE: Record<ReviewTargetKind, BackendReviewTargetType> = {
  product: "PRODUCT",
  vendor: "VENDOR",
};

const EMPTY_SUMMARY: ReviewSummary = {
  averageRating: 0,
  totalReviews: 0,
  breakdown: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
  recommendPercentage: 0,
};

/** Public reviews for a product or a store (newest first, up to 50). */
export function useTargetReviews(kind: ReviewTargetKind, targetId: string | undefined) {
  return useQuery({
    queryKey: targetReviewKeys.list(kind, targetId ?? ""),
    enabled: Boolean(targetId),
    staleTime: STALE_MS,
    queryFn: async (): Promise<Review[]> => {
      const res = await listPublicReviews(TARGET_TYPE[kind], targetId!, { limit: 50 });
      if (res.error) throw res.error;
      return res.reviews.map(mapBackendReview);
    },
  });
}

export function useTargetReviewSummary(kind: ReviewTargetKind, targetId: string | undefined) {
  return useQuery({
    queryKey: targetReviewKeys.summary(kind, targetId ?? ""),
    enabled: Boolean(targetId),
    staleTime: STALE_MS,
    queryFn: async (): Promise<ReviewSummary> => {
      const res = await getTargetRatingSummary(TARGET_TYPE[kind], targetId!);
      if (res.error || !res.summary) throw res.error ?? new Error("No summary");
      const s = res.summary;
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
    },
    select: (summary) => summary ?? EMPTY_SUMMARY,
  });
}

/** Keys ("PRODUCT:<id>") of everything the signed-in user has already reviewed. */
export function useMyReviewedTargets() {
  const { status } = useAuth();
  return useQuery({
    queryKey: targetReviewKeys.mine(),
    enabled: status === "authenticated",
    staleTime: STALE_MS,
    queryFn: async (): Promise<Set<string>> => {
      const res = await getMyReviews({ limit: 100 });
      if (res.error) throw res.error;
      return new Set(res.reviews.map((r) => `${r.targetType}:${r.targetId}`));
    },
  });
}

export function reviewedKey(kind: ReviewTargetKind, targetId: string): string {
  return `${TARGET_TYPE[kind]}:${targetId}`;
}

export function useSubmitReview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      kind: ReviewTargetKind;
      targetId: string;
      rating: number;
      title?: string;
      comment: string;
    }) => {
      const res = await createReview({
        targetType: TARGET_TYPE[input.kind],
        targetId: input.targetId,
        rating: input.rating,
        title: input.title,
        comment: input.comment,
      });
      if (res.error) throw res.error;
      return res.review;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: targetReviewKeys.all }),
  });
}

export function useReportPublicReview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { reviewId: string; reason: string; details?: string }) => {
      const res = await reportReviewApi(input.reviewId, input.reason, input.details);
      if (res.error) throw res.error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: targetReviewKeys.all }),
  });
}
