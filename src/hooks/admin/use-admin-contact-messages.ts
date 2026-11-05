"use client";

// ============================================================
// ADMIN CONTACT MESSAGES HOOKS
// ============================================================
//
// The public contact form's inbox. Marking a message handled or deleting it
// refreshes the whole contact-messages tree so the tab counts stay right.
// ============================================================

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminKeys } from "@/lib/query-keys";
import { contactMessagesService } from "@/services/admin";
import type { ContactMessagesQuery } from "@/services/admin/contact-messages.service";

export function useAdminContactMessages(query: ContactMessagesQuery) {
  return useQuery({
    queryKey: adminKeys.contactMessages.list(query),
    queryFn: () => contactMessagesService.list(query),
    placeholderData: keepPreviousData,
  });
}

function useRefreshMessages() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: adminKeys.contactMessages.all });
}

/** Mark a message handled, or put it back among the waiting ones. */
export function useSetContactHandled() {
  const refresh = useRefreshMessages();
  return useMutation({
    mutationFn: ({ id, handled }: { id: string; handled: boolean }) =>
      contactMessagesService.setHandled(id, handled),
    onSuccess: () => void refresh(),
  });
}

export function useDeleteContactMessage() {
  const refresh = useRefreshMessages();
  return useMutation({
    mutationFn: (id: string) => contactMessagesService.remove(id),
    onSuccess: () => void refresh(),
  });
}
