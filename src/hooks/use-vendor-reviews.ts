"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { vendorReviewKeys } from "@/lib/query-keys";
import {
  fetchVendorReview,
  fetchVendorReviewCounts,
  fetchVendorReviewSummary,
  fetchVendorReviews,
  patchVendorReply,
  postVendorReply,
  removeVendorReply,
  reportReview,
} from "@/services/vendor-reviews-api";
import type { ReviewReportReason } from "@/types";
import type { VendorReviewQuery } from "@/types/vendor-reviews";

const STALE_MS = 15_000;

function useAuthenticated() {
  return useAuth().status === "authenticated";
}

export function useVendorReviews(query: VendorReviewQuery) {
  const enabled = useAuthenticated();
  return useQuery({
    queryKey: vendorReviewKeys.list(query),
    queryFn: () => fetchVendorReviews(query),
    enabled,
    staleTime: STALE_MS,
    placeholderData: keepPreviousData,
  });
}

export function useVendorReviewSummary() {
  const enabled = useAuthenticated();
  return useQuery({
    queryKey: vendorReviewKeys.summary(),
    queryFn: async () => {
      const [summary, counts] = await Promise.all([
        fetchVendorReviewSummary(),
        fetchVendorReviewCounts(),
      ]);
      return { summary, counts };
    },
    enabled,
    staleTime: STALE_MS,
  });
}

export function useVendorReview(id: string) {
  const enabled = useAuthenticated();
  return useQuery({
    queryKey: vendorReviewKeys.detail(id),
    queryFn: () => fetchVendorReview(id),
    enabled,
    staleTime: STALE_MS,
  });
}

function useInvalidateReviews() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: vendorReviewKeys.all });
}

export function useReplyToReview() {
  const invalidate = useInvalidateReviews();
  return useMutation({
    mutationFn: ({ id, text }: { id: string; text: string }) => postVendorReply(id, text.trim()),
    onSuccess: invalidate,
  });
}

export function useUpdateReviewReply() {
  const invalidate = useInvalidateReviews();
  return useMutation({
    mutationFn: ({ id, text }: { id: string; text: string }) => patchVendorReply(id, text.trim()),
    onSuccess: invalidate,
  });
}

export function useDeleteReviewReply() {
  const invalidate = useInvalidateReviews();
  return useMutation({
    mutationFn: (id: string) => removeVendorReply(id),
    onSuccess: invalidate,
  });
}

export function useReportReview() {
  const invalidate = useInvalidateReviews();
  return useMutation({
    mutationFn: ({
      id,
      reason,
      details,
    }: {
      id: string;
      reason: ReviewReportReason;
      details?: string;
    }) => reportReview(id, reason, details),
    onSuccess: invalidate,
  });
}
