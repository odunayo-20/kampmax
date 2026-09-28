"use client";

// ============================================================
// ADMIN VENDOR / FREELANCER PAYOUTS HOOKS (Module 45)
// ============================================================
//
// TanStack Query wrappers over the payout-management service.
// Keys are NOT campus-scoped — payout records are restricted to full
// operators (ADMIN/SUPER_ADMIN) at the nav-permission layer, so there
// is no campus shard to leak across. Mostly read-only: the one mutation
// (resolve) closes the gap left by having no disbursement provider wired
// in — it lets an admin record what actually happened to a pending
// bank-transfer withdrawal (approve/process/retry/cancel are still not
// endpoints; a withdrawal is either resolved successful, failed or
// reversed, once, by hand).
// ============================================================

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminKeys } from "@/lib/query-keys";
import { payoutManagementService } from "@/services/admin";
import type { ManagedPayoutListQuery, ResolvePayoutInput } from "@/types/admin";
import { useAdminSession } from "@/lib/admin/admin-auth-context";

function useActor() {
  const { admin } = useAdminSession();
  if (!admin) {
    throw new Error("Admin payout hooks require an authenticated admin session");
  }
  return admin;
}

export function useAdminPayouts(query: ManagedPayoutListQuery) {
  useActor();
  return useQuery({
    queryKey: adminKeys.payouts.list(query),
    queryFn: () => payoutManagementService.list(query),
  });
}

export function useAdminPayout(id: string) {
  useActor();
  return useQuery({
    queryKey: adminKeys.payouts.detail(id),
    queryFn: () => payoutManagementService.getById(id),
  });
}

export function useAdminPayoutCounts() {
  useActor();
  return useQuery({
    queryKey: adminKeys.payouts.counts(),
    queryFn: () => payoutManagementService.getCounts(),
  });
}

export function useAdminPayoutFacets() {
  useActor();
  return useQuery({
    queryKey: adminKeys.payouts.facets(),
    queryFn: () => payoutManagementService.getFacets(),
  });
}

/** Records the real outcome of a pending bank-transfer withdrawal. */
export function useResolvePayoutMutation() {
  useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: ResolvePayoutInput }) =>
      payoutManagementService.resolvePayout(id, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminKeys.payouts.all });
    },
  });
}