"use client";

// ============================================================
// ADMIN REVIEW MANAGEMENT HOOKS (Module 41)
// ============================================================
//
// TanStack Query wrappers over the review-management service.
// Keys are scope-qualified by the acting operator's campus so a
// campus-scoped admin's cache can never leak rows/counts across campus
// boundaries. One real mutation: moderate (publish/hide/flag/remove),
// backed by the real reviews store.
// ============================================================

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminKeys } from "@/lib/query-keys";
import { reviewManagementService } from "@/services/admin";
import type { ManagedReviewListQuery, ModerateReviewInput } from "@/types/admin";
import { useAdminSession } from "@/lib/admin/admin-auth-context";

function useActor() {
  const { admin } = useAdminSession();
  if (!admin) {
    throw new Error("Admin review hooks require an authenticated admin session");
  }
  return admin;
}

export function useAdminReviews(query: ManagedReviewListQuery) {
  const admin = useActor();
  return useQuery({
    queryKey: adminKeys.reviews.list(query, admin.campusId),
    queryFn: () => reviewManagementService.list(query),
  });
}

export function useAdminReviewCounts() {
  const admin = useActor();
  return useQuery({
    queryKey: adminKeys.reviews.counts(admin.campusId),
    queryFn: () => reviewManagementService.getCounts(),
  });
}

export function useAdminReviewFacets() {
  const admin = useActor();
  return useQuery({
    queryKey: adminKeys.reviews.facets(admin.campusId),
    queryFn: () => reviewManagementService.getFacets(),
  });
}

export function useAdminReview(id: string) {
  const admin = useActor();
  return useQuery({
    queryKey: adminKeys.reviews.detail(id, admin.campusId),
    queryFn: () => reviewManagementService.getById(id),
  });
}

/** Publishes, hides, flags or removes a review. */
export function useModerateReviewMutation() {
  useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: ModerateReviewInput }) =>
      reviewManagementService.moderateReview(id, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminKeys.reviews.all });
    },
  });
}