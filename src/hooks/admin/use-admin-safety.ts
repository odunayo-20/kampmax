"use client";

// ============================================================
// ADMIN TRUST & SAFETY HOOKS (Module 42)
// ============================================================
//
// TanStack Query wrappers over the trust-safety service.
// Keys are scope-qualified by the acting operator's campus so a
// campus-scoped admin's cache can never leak rows/counts across campus
// boundaries. One real mutation: moving a campus-post report through
// review (open -> reviewing -> resolved/dismissed) — a flagged review
// resolves separately, by moderating the review itself.
// ============================================================

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminKeys } from "@/lib/query-keys";
import { trustSafetyService } from "@/services/admin";
import type {
  TrustSafetyReportListQuery,
  UpdateSafetyReportStatusInput,
} from "@/types/admin";
import { useAdminSession } from "@/lib/admin/admin-auth-context";

function useActor() {
  const { admin } = useAdminSession();
  if (!admin) {
    throw new Error(
      "Admin trust & safety hooks require an authenticated admin session"
    );
  }
  return admin;
}

export function useAdminSafetyReports(query: TrustSafetyReportListQuery) {
  const admin = useActor();
  return useQuery({
    queryKey: adminKeys.trustSafety.list(query, admin.campusId),
    queryFn: () => trustSafetyService.list(query),
  });
}

export function useAdminSafetyCounts() {
  const admin = useActor();
  return useQuery({
    queryKey: adminKeys.trustSafety.counts(admin.campusId),
    queryFn: () => trustSafetyService.getCounts(),
  });
}

export function useAdminSafetyFacets() {
  const admin = useActor();
  return useQuery({
    queryKey: adminKeys.trustSafety.facets(admin.campusId),
    queryFn: () => trustSafetyService.getFacets(),
  });
}

export function useAdminSafetyReport(id: string) {
  const admin = useActor();
  return useQuery({
    queryKey: adminKeys.trustSafety.detail(id, admin.campusId),
    queryFn: () => trustSafetyService.getById(id),
  });
}

/** Moves a campus-post report through review (reviewing/resolved/dismissed). */
export function useSetSafetyReportStatusMutation() {
  useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateSafetyReportStatusInput }) =>
      trustSafetyService.setReportStatus(id, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminKeys.trustSafety.all });
    },
  });
}