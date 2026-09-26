"use client";

// ============================================================
// ADMIN EMPLOYER MANAGEMENT HOOKS (Module 37)
// ============================================================
//
// TanStack Query wrappers over the employer-management service.
// Keys are scope-qualified by the acting operator's campus so a
// campus-scoped admin's cache can never leak rows/counts across
// campus boundaries. Mutations invalidate the whole
// `adminKeys.employers` tree so list, counts, detail and
// activity stay consistent.
// ============================================================

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminKeys } from "@/lib/query-keys";
import { employerManagementService, fetchEmployerCampusOptions } from "@/services/admin";
import type { ManagedEmployerListQuery, ManagedEmployer, EmployerActivityEvent } from "@/types/admin";
import { useAdminSession } from "@/lib/admin/admin-auth-context";

function useActor() {
  const { admin } = useAdminSession();
  if (!admin) {
    throw new Error("Admin employer hooks require an authenticated admin session");
  }
  return admin;
}

export function useAdminEmployerCampuses() {
  return useQuery({
    queryKey: [...adminKeys.employers.all, "campuses"],
    queryFn: fetchEmployerCampusOptions,
    staleTime: 5 * 60_000,
  });
}

export function useAdminEmployers(query: ManagedEmployerListQuery) {
  const admin = useActor();
  return useQuery({
    queryKey: adminKeys.employers.list(query, admin.campusId),
    queryFn: () => employerManagementService.list(query),
  });
}

export function useAdminEmployerCounts() {
  const admin = useActor();
  return useQuery({
    queryKey: adminKeys.employers.counts(admin.campusId),
    queryFn: () => employerManagementService.getCounts(),
  });
}

export function useAdminEmployer(id: string) {
  const admin = useActor();
  return useQuery({
    queryKey: adminKeys.employers.detail(id, admin.campusId),
    queryFn: () => employerManagementService.getById(id),
  });
}

export function useAdminEmployerActivity(id: string) {
  const admin = useActor();
  return useQuery({
    queryKey: adminKeys.employers.activity(id, admin.campusId),
    queryFn: () => employerManagementService.getActivity(id),
  });
}

function useEmployerTreeInvalidator() {
  const queryClient = useQueryClient();
  return {
    invalidate: () => void queryClient.invalidateQueries({ queryKey: adminKeys.employers.all }),
  };
}

export function useAdminEmployerSuspendMutation() {
  const { invalidate } = useEmployerTreeInvalidator();
  const admin = useActor();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      employerManagementService.suspend(id, { actor: admin }, reason),
    onSuccess: invalidate,
  });
}

export function useAdminEmployerRestoreMutation() {
  const { invalidate } = useEmployerTreeInvalidator();
  const admin = useActor();
  return useMutation({
    mutationFn: (id: string) => employerManagementService.restore(id, { actor: admin }),
    onSuccess: invalidate,
  });
}

export function useAdminEmployerApproveMutation() {
  const { invalidate } = useEmployerTreeInvalidator();
  const admin = useActor();
  return useMutation({
    mutationFn: (id: string) => employerManagementService.approve(id, { actor: admin }),
    onSuccess: invalidate,
  });
}

export function useAdminEmployerRejectMutation() {
  const { invalidate } = useEmployerTreeInvalidator();
  const admin = useActor();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      employerManagementService.reject(id, reason, { actor: admin }),
    onSuccess: invalidate,
  });
}