"use client";

// ============================================================
// ADMIN COMMUNICATIONS HOOKS (Module 47)
// ============================================================
//
// TanStack Query wrappers over the communication-management service.
// Keys are NOT campus-scoped — communications are restricted to full
// operators (ADMIN/SUPER_ADMIN) at the nav-permission layer, so no
// campus shard exists. Read-only namespace + one create mutation
// (dispatches real in-app records via pushNotificationRecord).
//
// The AdminHeader bell and /admin/notifications console both read
// from this live shared in-app notification store.
// ============================================================

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminKeys } from "@/lib/query-keys";
import { adminCommunicationService } from "@/services/admin";
import type {
  ManagedNotificationQuery,
  NotificationBroadcastAudience,
  ManagedNotificationBroadcastInput,
} from "@/types/admin";
import { useAdminSession } from "@/lib/admin/admin-auth-context";

export function useAdminNotificationOverview() {
  const { admin } = useAdminSession();
  return useQuery({
    queryKey: adminKeys.notifications.overview(),
    queryFn: () => adminCommunicationService.getOverview(),
    enabled: !!admin,
  });
}

export function useAdminNotificationList(query?: ManagedNotificationQuery) {
  const { admin } = useAdminSession();
  return useQuery({
    queryKey: adminKeys.notifications.list(query ?? {}),
    queryFn: () => adminCommunicationService.list(query),
    enabled: !!admin,
  });
}

export function useAdminNotificationDetail(id: string | null) {
  const { admin } = useAdminSession();
  return useQuery({
    queryKey: adminKeys.notifications.detail(id ?? "none"),
    queryFn: () => (id ? adminCommunicationService.getById(id) : null),
    enabled: !!admin && !!id,
  });
}

export function useAdminAudiencePreview(
  audience: NotificationBroadcastAudience,
  campusId?: string | null,
  userId?: string | null
) {
  const { admin } = useAdminSession();
  return useQuery({
    queryKey: adminKeys.notifications.audiencePreview(audience, campusId, userId),
    queryFn: () =>
      adminCommunicationService.getAudiencePreview(audience, campusId, userId),
    enabled: !!admin,
  });
}

export function useAdminCreateNotification() {
  const { admin } = useAdminSession();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ManagedNotificationBroadcastInput) => {
      if (!admin) throw new Error("Authenticated session required");
      return adminCommunicationService.create(input);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.notifications.all });
    },
  });
}
