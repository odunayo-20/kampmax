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
// The AdminHeader bell uses the legacy fabricated `notificationService`
// (Module 34 territory) — it is NOT wired here. This console
// administers the SAME notification store the user center reads.
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

function useActor() {
  const { admin } = useAdminSession();
  if (!admin) {
    throw new Error("Admin communication hooks require an authenticated admin session");
  }
  return admin;
}

export function useAdminNotificationOverview() {
  useActor();
  return useQuery({
    queryKey: adminKeys.notifications.overview(),
    queryFn: () => adminCommunicationService.getOverview(),
  });
}

export function useAdminNotificationList(query?: ManagedNotificationQuery) {
  useActor();
  return useQuery({
    queryKey: adminKeys.notifications.list(query ?? {}),
    queryFn: () => adminCommunicationService.list(query),
  });
}

export function useAdminNotificationDetail(id: string | null) {
  useActor();
  return useQuery({
    queryKey: adminKeys.notifications.detail(id ?? "none"),
    queryFn: () => (id ? adminCommunicationService.getById(id) : null),
    enabled: !!id,
  });
}

export function useAdminAudiencePreview(
  audience: NotificationBroadcastAudience,
  campusId?: string | null,
  userId?: string | null
) {
  useActor();
  return useQuery({
    queryKey: adminKeys.notifications.audiencePreview(audience, campusId, userId),
    queryFn: () =>
      adminCommunicationService.getAudiencePreview(audience, campusId, userId),
  });
}

export function useAdminCreateNotification() {
  useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ManagedNotificationBroadcastInput) =>
      adminCommunicationService.create(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.notifications.all });
    },
  });
}
