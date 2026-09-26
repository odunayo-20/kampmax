"use client";

// ============================================================
// ADMIN FREELANCER MANAGEMENT HOOKS (Module 36)
// ============================================================
//
// TanStack Query wrappers over the freelancer-management service.
// Keys are scope-qualified by the acting operator's campus so a
// campus-scoped admin's cache can never leak rows/counts across
// campus boundaries. Mutations invalidate the whole
// `adminKeys.freelancers` tree so list, counts, detail and
// activity stay consistent.
// ============================================================

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminKeys } from "@/lib/query-keys";
import { freelancerManagementService } from "@/services/admin";
import type { ManagedFreelancersListQuery, ManagedFreelancer, FreelancerActivityEvent } from "@/types/admin";
import { useAdminSession } from "@/lib/admin/admin-auth-context";

function useActor() {
  const { admin } = useAdminSession();
  if (!admin) {
    throw new Error("Admin freelancer hooks require an authenticated admin session");
  }
  return admin;
}

export function useAdminFreelancers(query: ManagedFreelancersListQuery) {
  const admin = useActor();
  return useQuery({
    queryKey: adminKeys.freelancers.list(query, admin.campusId),
    queryFn: () => freelancerManagementService.list(query),
  });
}

export function useAdminFreelancerCounts() {
  const admin = useActor();
  return useQuery({
    queryKey: adminKeys.freelancers.counts(admin.campusId),
    queryFn: () => freelancerManagementService.getCounts(),
  });
}

export function useAdminFreelancer(id: string) {
  const admin = useActor();
  return useQuery({
    queryKey: adminKeys.freelancers.detail(id, admin.campusId),
    queryFn: () => freelancerManagementService.getById(id),
  });
}

export function useAdminFreelancerActivity(id: string) {
  const admin = useActor();
  return useQuery({
    queryKey: adminKeys.freelancers.activity(id, admin.campusId),
    queryFn: () => freelancerManagementService.getActivity(id),
  });
}

export function useAdminFreelancerSuspendMutation() {
  const admin = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      freelancerManagementService.suspend(id, { actor: admin }, reason),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminKeys.freelancers.all });
    },
  });
}

export function useAdminFreelancerActivateMutation() {
  const admin = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => freelancerManagementService.activate(id, { actor: admin }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminKeys.freelancers.all });
    },
  });
}

export function useAdminFreelancerDeactivateMutation() {
  const admin = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      freelancerManagementService.deactivate(id, { actor: admin }, reason),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminKeys.freelancers.all });
    },
  });
}

export function useAdminFreelancerFeatureMutation() {
  const admin = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => freelancerManagementService.feature(id, { actor: admin }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminKeys.freelancers.all });
    },
  });
}

export function useAdminFreelancerUnfeatureMutation() {
  const admin = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => freelancerManagementService.unfeature(id, { actor: admin }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminKeys.freelancers.all });
    },
  });
}