"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { settingsKeys } from "@/lib/query-keys";
import * as authService from "@/services/auth";
import {
  getNotificationPreferences,
  updateNotificationPreferences,
  getPrivacySettings,
  updatePrivacySettings,
  getSecuritySettings,
  updateSecuritySettings,
} from "@/services/profile";
import {
  getEmployerDashboardAccess,
  getEmployerOnboardingDraftForUser,
  getEmployerVerificationStatusForUser,
  type EmployerAccess,
} from "@/services/employer";
import { getCampusById } from "@/services/campus";
import type {
  NotificationPreferences,
  PrivacySettings,
  SecuritySettings,
} from "@/types";
import type {
  EmployerOnboardingStatus,
  EmployerVerificationStatus,
} from "@/types/employer";

function delay(ms = 250): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ============================================================
// Account identity + employer linkage (owner-scoped read)
// ============================================================

export interface EmployerAccountSettings {
  access: EmployerAccess;
  approval: {
    status: EmployerOnboardingStatus | null;
    verification: EmployerVerificationStatus;
    orgName: string;
    campusName: string | null;
    approvedSlug: string | null;
    isPublic: boolean;
  };
}

export function useEmployerAccountSettings() {
  const { status, user } = useAuth();
  const userId = user?.id ?? null;
  const enabled = status === "authenticated" && !!userId;

  return useQuery({
    queryKey: settingsKeys.account(userId ?? ""),
    enabled,
    queryFn: async (): Promise<EmployerAccountSettings | null> => {
      await delay();
      const access = getEmployerDashboardAccess();
      const draft = getEmployerOnboardingDraftForUser();
      if (!draft) {
        return {
          access,
          approval: {
            status: access.status,
            verification: "not_started",
            orgName: "",
            campusName: null,
            approvedSlug: null,
            isPublic: false,
          },
        };
      }
      const campus = draft.location.campusId
        ? getCampusById(draft.location.campusId)
        : undefined;
      return {
        access,
        approval: {
          status: draft.status,
          verification: getEmployerVerificationStatusForUser(),
          orgName:
            draft.organization?.name?.trim() ||
            draft.profile?.displayName?.trim() ||
            "",
          campusName: campus?.name ?? null,
          approvedSlug: draft.approvedSlug ?? null,
          isPublic: !!draft.approvedSlug && draft.status === "APPROVED",
        },
      };
    },
  });
}

// ============================================================
// Notification preferences (share the platform-wide record)
// ============================================================

export function useNotificationPreferences() {
  const { status, user } = useAuth();
  const userId = user?.id ?? "";
  const enabled = status === "authenticated";

  return useQuery({
    queryKey: settingsKeys.notificationPreferences(userId),
    enabled,
    queryFn: async (): Promise<NotificationPreferences> => {
      await delay();
      return getNotificationPreferences();
    },
  });
}

export function useUpdateNotificationPreferences() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const userId = user?.id ?? "";
  const key = settingsKeys.notificationPreferences(userId);

  return useMutation({
    mutationFn: async (data: Partial<NotificationPreferences>) => {
      await delay(150);
      return updateNotificationPreferences(data);
    },
    onMutate: async (data) => {
      await queryClient.cancelQueries({ queryKey: settingsKeys.all });
      const prev = queryClient.getQueryData<NotificationPreferences>(key);
      if (prev) {
        queryClient.setQueryData<NotificationPreferences>(key, {
          ...prev,
          ...data,
        });
      }
      return { prev };
    },
    onError: (_err, _data, ctx) => {
      if (ctx?.prev) {
        queryClient.setQueryData<NotificationPreferences>(key, ctx.prev);
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: settingsKeys.all });
    },
  });
}

// ============================================================
// Privacy settings (share the platform-wide record)
// ============================================================

export function usePrivacySettings() {
  const { status, user } = useAuth();
  const userId = user?.id ?? "";
  const enabled = status === "authenticated";

  return useQuery({
    queryKey: settingsKeys.privacySettings(userId),
    enabled,
    queryFn: async (): Promise<PrivacySettings> => {
      await delay();
      return getPrivacySettings();
    },
  });
}

export function useUpdatePrivacySettings() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const userId = user?.id ?? "";
  const key = settingsKeys.privacySettings(userId);

  return useMutation({
    mutationFn: async (data: Partial<PrivacySettings>) => {
      await delay(150);
      return updatePrivacySettings(data);
    },
    onMutate: async (data) => {
      await queryClient.cancelQueries({ queryKey: settingsKeys.all });
      const prev = queryClient.getQueryData<PrivacySettings>(key);
      if (prev) {
        queryClient.setQueryData<PrivacySettings>(key, {
          ...prev,
          ...data,
        });
      }
      return { prev };
    },
    onError: (_err, _data, ctx) => {
      if (ctx?.prev) {
        queryClient.setQueryData<PrivacySettings>(key, ctx.prev);
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: settingsKeys.all });
    },
  });
}

// ============================================================
// Security settings (share the platform-wide record)
// ============================================================

export function useSecuritySettings() {
  const { status, user } = useAuth();
  const userId = user?.id ?? "";
  const enabled = status === "authenticated";

  return useQuery({
    queryKey: settingsKeys.securitySettings(userId),
    enabled,
    queryFn: async (): Promise<SecuritySettings> => {
      await delay();
      return getSecuritySettings();
    },
  });
}

export function useUpdateSecuritySettings() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const userId = user?.id ?? "";
  const key = settingsKeys.securitySettings(userId);

  return useMutation({
    mutationFn: async (data: Partial<SecuritySettings>) => {
      await delay(150);
      return updateSecuritySettings(data);
    },
    onMutate: async (data) => {
      await queryClient.cancelQueries({ queryKey: settingsKeys.all });
      const prev = queryClient.getQueryData<SecuritySettings>(key);
      if (prev) {
        queryClient.setQueryData<SecuritySettings>(key, {
          ...prev,
          ...data,
        });
      }
      return { prev };
    },
    onError: (_err, _data, ctx) => {
      if (ctx?.prev) {
        queryClient.setQueryData<SecuritySettings>(key, ctx.prev);
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: settingsKeys.all });
    },
  });
}

// ============================================================
// Password / deactivate / delete (backend-authoritative)
// ============================================================

/** Change password for the authenticated user. Throws on rejection; the
 *  returned message is the backend's user-facing feedback. */
export function useChangePassword() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const email = user?.email ?? "";

  return useMutation({
    mutationFn: async (data: {
      currentPassword: string;
      newPassword: string;
    }) => {
      await delay(400);
      return authService.changePassword({ email, ...data });
    },
    onSuccess: (result) => {
      if (result.success) {
        void queryClient.invalidateQueries({ queryKey: settingsKeys.all });
      }
    },
  });
}

export function useDeactivateAccount() {
  const { accessToken } = useAuth();

  return useMutation({
    mutationFn: async () => {
      if (!accessToken) throw new Error("Not authenticated.");
      await delay(400);
      return authService.deactivateAccount(accessToken);
    },
  });
}

export function useDeleteAccount() {
  const { accessToken } = useAuth();

  return useMutation({
    mutationFn: async (verifiedEmail: string) => {
      if (!accessToken) throw new Error("Not authenticated.");
      await delay(400);
      return authService.deleteAccount(accessToken, verifiedEmail);
    },
  });
}