"use client";

// ============================================================
// ADMIN JOB MANAGEMENT HOOKS (Module 40)
// ============================================================
//
// TanStack Query wrappers over the read-only job-management service.
// Keys are scope-qualified by the acting operator's campus so a
// campus-scoped admin's cache can never leak rows/counts across campus
// boundaries. The console is deliberately read-only — the opportunity
// store exposes no admin moderation transitions, so there are no
// mutation hooks.
// ============================================================

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminKeys, jobKeys } from "@/lib/query-keys";
import { jobManagementService } from "@/services/admin";
import type { TakeDownJobInput } from "@/services/admin/job-management.service";
import type { ManagedJobListQuery } from "@/types/admin";
import { useAdminSession } from "@/lib/admin/admin-auth-context";

function useActor() {
  const { admin } = useAdminSession();
  if (!admin) {
    throw new Error("Admin job hooks require an authenticated admin session");
  }
  return admin;
}

export function useAdminJobs(query: ManagedJobListQuery) {
  const admin = useActor();
  return useQuery({
    queryKey: adminKeys.jobs.list(query, admin.campusId),
    queryFn: () => jobManagementService.list(query),
  });
}

export function useAdminJobCounts() {
  const admin = useActor();
  return useQuery({
    queryKey: adminKeys.jobs.counts(admin.campusId),
    queryFn: () => jobManagementService.getCounts(),
  });
}

export function useAdminJobFacets() {
  const admin = useActor();
  return useQuery({
    queryKey: adminKeys.jobs.facets(admin.campusId),
    queryFn: () => jobManagementService.getFacets(),
  });
}

export function useAdminJob(id: string) {
  const admin = useActor();
  return useQuery({
    queryKey: adminKeys.jobs.detail(id, admin.campusId),
    queryFn: () => jobManagementService.getById(id),
  });
}

/** Who applied to one posting, a page at a time. */
export function useAdminJobApplicants(id: string, page: number, pageSize = 10) {
  const admin = useActor();
  return useQuery({
    queryKey: adminKeys.jobs.applicants(id, page, admin.campusId),
    queryFn: () => jobManagementService.getApplicants(id, { page, pageSize }),
  });
}

/** Takes a posting down, with or without refunding its posting fee. */
export function useTakeDownJob(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: TakeDownJobInput) => jobManagementService.takeDown(id, input),
    onSuccess: () => {
      // Every admin job view, the public jobs, and the employer's billing change.
      void queryClient.invalidateQueries({ queryKey: adminKeys.all });
      void queryClient.invalidateQueries({ queryKey: jobKeys.all });
      void queryClient.invalidateQueries({ queryKey: ["posting-billing"] });
      void queryClient.invalidateQueries({ queryKey: ["wallet"] });
    },
  });
}

export function useAdminJobActivity(id: string) {
  const admin = useActor();
  return useQuery({
    queryKey: adminKeys.jobs.activity(id, admin.campusId),
    queryFn: () => jobManagementService.getActivity(id),
  });
}