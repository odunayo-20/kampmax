"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { settingsKeys } from "@/lib/query-keys";
import * as authService from "@/services/auth";
import {
  backendProfileToDraft,
  employerVerificationFrom,
  getEmployerDashboardAccessApi,
  getEmployerProfileApi,
  type EmployerAccess,
} from "@/services/employer";
import { getCampusById } from "@/services/campus";
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
      const access = await getEmployerDashboardAccessApi();
      const { profile, error } = await getEmployerProfileApi();
      if (error && error.status !== 404) throw error;
      if (!profile) {
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
      const draft = backendProfileToDraft(profile);
      const campus = draft.location.campusId ? getCampusById(draft.location.campusId) : undefined;
      return {
        access,
        approval: {
          status: access.status,
          verification: employerVerificationFrom(String(profile.verificationStatus)),
          orgName: draft.organization.name?.trim() || draft.profile.displayName?.trim() || "",
          campusName: campus?.name ?? null,
          approvedSlug: draft.approvedSlug ?? null,
          isPublic: !!draft.approvedSlug,
        },
      };
    },
  });
}

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