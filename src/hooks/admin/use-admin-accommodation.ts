"use client";

// ============================================================
// ADMIN ACCOMMODATION HOOKS
// ============================================================
//
// Every decision refreshes the whole accommodation tree, so the tab counts,
// the list an item leaves, and the detail page all stay in step (approving an
// agent moves them from Pending to Approved; approving a listing moves it out
// of the waiting queue).
// ============================================================

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminKeys } from "@/lib/query-keys";
import { accommodationService } from "@/services/admin";
import type { AgentsQuery, ListingsQuery, PaymentsQuery } from "@/services/admin/accommodation.service";

// ---------- agents ----------

export function useAdminAgents(query: AgentsQuery) {
  return useQuery({
    queryKey: adminKeys.accommodation.agents.list(query),
    queryFn: () => accommodationService.listAgents(query),
    placeholderData: keepPreviousData,
  });
}

export function useAdminAgent(id: string) {
  return useQuery({
    queryKey: adminKeys.accommodation.agents.detail(id),
    queryFn: () => accommodationService.getAgent(id),
    enabled: Boolean(id),
  });
}

export function useAdminAgentListings(id: string, page: number, pageSize = 10) {
  return useQuery({
    queryKey: adminKeys.accommodation.agents.listings(id, page),
    queryFn: () => accommodationService.agentListings(id, page, pageSize),
    enabled: Boolean(id),
    placeholderData: keepPreviousData,
  });
}

function useRefreshAccommodation() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: adminKeys.accommodation.all });
}

export function useApproveAgent() {
  const refresh = useRefreshAccommodation();
  return useMutation({
    mutationFn: (id: string) => accommodationService.approveAgent(id),
    onSuccess: () => void refresh(),
  });
}

export function useRejectAgent() {
  const refresh = useRefreshAccommodation();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      accommodationService.rejectAgent(id, reason),
    onSuccess: () => void refresh(),
  });
}

export function useRequestAgentInfo() {
  const refresh = useRefreshAccommodation();
  return useMutation({
    mutationFn: ({ id, message }: { id: string; message: string }) =>
      accommodationService.requestAgentInfo(id, message),
    onSuccess: () => void refresh(),
  });
}

export function useSuspendAgent() {
  const refresh = useRefreshAccommodation();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      accommodationService.suspendAgent(id, reason),
    onSuccess: () => void refresh(),
  });
}

export function useRestoreAgent() {
  const refresh = useRefreshAccommodation();
  return useMutation({
    mutationFn: (id: string) => accommodationService.restoreAgent(id),
    onSuccess: () => void refresh(),
  });
}

export function useRevokeAgent() {
  const refresh = useRefreshAccommodation();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      accommodationService.revokeAgent(id, reason),
    onSuccess: () => void refresh(),
  });
}

export function useReviewAgentDocument() {
  const refresh = useRefreshAccommodation();
  return useMutation({
    mutationFn: (input: {
      agentId: string;
      documentId: string;
      decision: "ACCEPTED" | "REJECTED";
      reason?: string;
    }) =>
      accommodationService.reviewAgentDocument(
        input.agentId,
        input.documentId,
        input.decision,
        input.reason
      ),
    onSuccess: () => void refresh(),
  });
}

// ---------- listings ----------

export function useAdminListings(query: ListingsQuery) {
  return useQuery({
    queryKey: adminKeys.accommodation.listings.list(query),
    queryFn: () => accommodationService.listListings(query),
    placeholderData: keepPreviousData,
  });
}

export function useAdminListing(id: string) {
  return useQuery({
    queryKey: adminKeys.accommodation.listings.detail(id),
    queryFn: () => accommodationService.getListing(id),
    enabled: Boolean(id),
  });
}

export function useApproveListing() {
  const refresh = useRefreshAccommodation();
  return useMutation({
    mutationFn: (id: string) => accommodationService.approveListing(id),
    onSuccess: () => void refresh(),
  });
}

export function useRejectListing() {
  const refresh = useRefreshAccommodation();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      accommodationService.rejectListing(id, reason),
    onSuccess: () => void refresh(),
  });
}

export function useSuspendListing() {
  const refresh = useRefreshAccommodation();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      accommodationService.suspendListing(id, reason),
    onSuccess: () => void refresh(),
  });
}

export function useRestoreListing() {
  const refresh = useRefreshAccommodation();
  return useMutation({
    mutationFn: (id: string) => accommodationService.restoreListing(id),
    onSuccess: () => void refresh(),
  });
}

// ---------- payments ----------

/** `enabled` lets a page skip the request for an admin who may not see payments. */
export function useAdminPayments(query: PaymentsQuery, enabled = true) {
  return useQuery({
    queryKey: adminKeys.accommodation.payments.list(query),
    queryFn: () => accommodationService.listPayments(query),
    placeholderData: keepPreviousData,
    enabled,
  });
}

export function usePaymentReconciliation(enabled = true) {
  return useQuery({
    queryKey: adminKeys.accommodation.payments.reconciliation,
    queryFn: () => accommodationService.paymentReconciliation(),
    enabled,
  });
}

export function useFlagPaymentForRefund() {
  const refresh = useRefreshAccommodation();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      accommodationService.flagPaymentForRefund(id, reason),
    onSuccess: () => void refresh(),
  });
}

export function useRefundPayment() {
  const refresh = useRefreshAccommodation();
  return useMutation({
    mutationFn: (id: string) => accommodationService.refundPayment(id),
    onSuccess: () => void refresh(),
  });
}
