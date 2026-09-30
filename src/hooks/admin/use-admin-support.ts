"use client";

// ============================================================
// ADMIN SUPPORT & CUSTOMER SERVICE HOOKS (Module 56)
// ============================================================
//
// TanStack Query wrappers over the support-management service.
// Keys are scope-qualified by the acting operator's campus so a
// campus-scoped admin's cache can never leak rows/counts across
// campus boundaries. Mutations (respond / note / assign / status /
// priority / escalate) invalidate the whole `adminKeys.support`
// tree so list, detail and metrics stay consistent.
// ============================================================

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminKeys, notificationKeys } from "@/lib/query-keys";
import { supportManagementService } from "@/services/admin";
import type {
  SupportAssignInput,
  SupportEscalateInput,
  SupportRespondInput,
  SupportSetPriorityInput,
  SupportSetStatusInput,
  SupportTicketListQuery,
} from "@/types/admin";
import { useAdminSession } from "@/lib/admin/admin-auth-context";

function useActor() {
  const { admin } = useAdminSession();
  if (!admin) {
    throw new Error("Admin support hooks require an authenticated admin session");
  }
  return admin;
}

export function useAdminSupportTickets(query: SupportTicketListQuery) {
  const admin = useActor();
  return useQuery({
    queryKey: adminKeys.support.list(query, admin.campusId),
    queryFn: () => supportManagementService.list(query, { actor: admin }),
  });
}

export function useAdminSupportMetrics() {
  const admin = useActor();
  return useQuery({
    queryKey: adminKeys.support.metrics(admin.campusId),
    queryFn: () => supportManagementService.getMetrics({ actor: admin }),
  });
}

export function useAdminSupportStaff() {
  const admin = useActor();
  return useQuery({
    queryKey: adminKeys.support.staff(admin.campusId),
    queryFn: () => supportManagementService.getAssignableStaff({ actor: admin }),
  });
}

export function useAdminSupportTicket(id: string) {
  const admin = useActor();
  return useQuery({
    queryKey: adminKeys.support.detail(id, admin.campusId),
    queryFn: () => supportManagementService.getById(id, { actor: admin }),
    enabled: Boolean(id),
  });
}

function useSupportTreeInvalidator() {
  const queryClient = useQueryClient();
  return {
    invalidate: () => {
      void queryClient.invalidateQueries({ queryKey: adminKeys.support.all });
      void queryClient.invalidateQueries({ queryKey: adminKeys.notifications.all });
      void queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  };
}

export function useAdminSupportRespondMutation() {
  const { invalidate } = useSupportTreeInvalidator();
  const admin = useActor();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: SupportRespondInput }) =>
      supportManagementService.respond(id, input, { actor: admin }),
    onSuccess: invalidate,
  });
}

export function useAdminSupportNoteMutation() {
  const { invalidate } = useSupportTreeInvalidator();
  const admin = useActor();
  return useMutation({
    mutationFn: ({ id, note }: { id: string; note: string }) =>
      supportManagementService.addInternalNote(id, note, { actor: admin }),
    onSuccess: invalidate,
  });
}

export function useAdminSupportAssignMutation() {
  const { invalidate } = useSupportTreeInvalidator();
  const admin = useActor();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: SupportAssignInput }) =>
      supportManagementService.assign(id, input, { actor: admin }),
    onSuccess: invalidate,
  });
}

export function useAdminSupportStatusMutation() {
  const { invalidate } = useSupportTreeInvalidator();
  const admin = useActor();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: SupportSetStatusInput }) =>
      supportManagementService.setStatus(id, input, { actor: admin }),
    onSuccess: invalidate,
  });
}

export function useAdminSupportPriorityMutation() {
  const { invalidate } = useSupportTreeInvalidator();
  const admin = useActor();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: SupportSetPriorityInput }) =>
      supportManagementService.setPriority(id, input, { actor: admin }),
    onSuccess: invalidate,
  });
}

export function useAdminSupportEscalateMutation() {
  const { invalidate } = useSupportTreeInvalidator();
  const admin = useActor();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: SupportEscalateInput }) =>
      supportManagementService.escalate(id, input, { actor: admin }),
    onSuccess: invalidate,
  });
}