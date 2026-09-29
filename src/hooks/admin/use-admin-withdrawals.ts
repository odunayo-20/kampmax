"use client";

// ============================================================
// ADMIN CUSTOMER WITHDRAWALS HOOKS
// ============================================================
//
// TanStack Query wrappers over the withdrawal-management service. Customer
// wallet withdrawals to a bank account — the WITHDRAWAL-type slice
// use-admin-payouts.ts deliberately excludes. Keys are NOT campus-scoped,
// same reasoning as payouts. Mostly read-only: the one mutation (resolve)
// closes the gap left by having no disbursement provider wired in — it
// lets an admin record what actually happened to a pending withdrawal.
// ============================================================

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminKeys } from "@/lib/query-keys";
import { withdrawalManagementService } from "@/services/admin";
import type {
  ManagedCustomerWithdrawalListQuery,
  ResolveCustomerWithdrawalInput,
} from "@/types/admin";
import { useAdminSession } from "@/lib/admin/admin-auth-context";

function useActor() {
  const { admin } = useAdminSession();
  if (!admin) {
    throw new Error("Admin withdrawal hooks require an authenticated admin session");
  }
  return admin;
}

export function useAdminWithdrawals(query: ManagedCustomerWithdrawalListQuery) {
  useActor();
  return useQuery({
    queryKey: adminKeys.withdrawals.list(query),
    queryFn: () => withdrawalManagementService.list(query),
  });
}

export function useAdminWithdrawal(id: string) {
  useActor();
  return useQuery({
    queryKey: adminKeys.withdrawals.detail(id),
    queryFn: () => withdrawalManagementService.getById(id),
  });
}

export function useAdminWithdrawalCounts() {
  useActor();
  return useQuery({
    queryKey: adminKeys.withdrawals.counts(),
    queryFn: () => withdrawalManagementService.getCounts(),
  });
}

/** Records the real outcome of a pending customer withdrawal. */
export function useResolveWithdrawalMutation() {
  useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: ResolveCustomerWithdrawalInput }) =>
      withdrawalManagementService.resolve(id, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminKeys.withdrawals.all });
    },
  });
}
