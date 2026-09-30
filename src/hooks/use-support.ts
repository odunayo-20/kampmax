"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { adminKeys, notificationKeys, supportKeys } from "@/lib/query-keys";
import { supportService } from "@/services/support";
import type {
  SupportCustomerCreateInput,
  SupportCustomerReplyInput,
} from "@/types/admin";

const enabledFor = (status: string, userId: string | null) =>
  status === "authenticated" && !!userId;

/**
 * The caller's support requests, newest activity first. The store scopes by
 * session, so each customer only ever sees their own cases.
 */
export function useSupportTickets() {
  const { status, user } = useAuth();
  const userId = user?.id ?? null;

  return useQuery({
    queryKey: supportKeys.list(userId ?? ""),
    enabled: enabledFor(status, userId),
    queryFn: async () => supportService.listMine(userId!),
  });
}

/**
 * A single support case with its full customer-visibility message thread.
 * Internal notes and escalation metadata are never returned by the store.
 */
export function useSupportTicket(ticketId: string | null) {
  const { status, user } = useAuth();
  const userId = user?.id ?? null;

  return useQuery({
    queryKey: supportKeys.detail(userId ?? "", ticketId ?? ""),
    enabled: enabledFor(status, userId) && !!ticketId,
    queryFn: async () =>
      ticketId ? supportService.getMine(userId!, ticketId) : null,
  });
}

/**
 * Opens a new request. On success the store returns the fully
 * constructed detail (id assigned server-side), which the caller uses to
 * navigate to `/support/[ticketId]`.
 */
export function useCreateSupportTicket() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const userId = user?.id ?? null;

  return useMutation({
    mutationFn: async (input: SupportCustomerCreateInput) =>
      supportService.createForCustomer(userId!, input),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: supportKeys.all });
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
      queryClient.invalidateQueries({ queryKey: adminKeys.notifications.all });
    },
  });
}

/**
 * Posts a reply to one of the caller's cases. Blocks replies to
 * resolved/closed cases; refreshes the case thread and the list together.
 */
export function useReplySupportTicket(ticketId: string) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const userId = user?.id ?? null;

  return useMutation({
    mutationFn: async (input: SupportCustomerReplyInput) =>
      supportService.replyForCustomer(userId!, ticketId, input),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: supportKeys.all });
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
      queryClient.invalidateQueries({ queryKey: adminKeys.notifications.all });
    },
  });
}