"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { employerKeys, dashboardKeys } from "@/lib/query-keys";
import {
  getEmployerOnboardingDraftForUser,
  updateEmployerProfileApi,
  updateEmployerProfileForUser,
} from "@/services/employer";
import { computeEmployerCompletion } from "@/services/employer";
import type { EmployerOnboardingDraft, EmployerProfileUpdatePayload } from "@/types/employer";

function delay(ms = 250): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Employer profile read (owner-scoped). */
export function useEmployerProfile() {
  const { status, user } = useAuth();
  const userId = user?.id ?? null;
  const enabled = status === "authenticated" && !!userId;

  return useQuery({
    queryKey: employerKeys.profile(userId ?? ""),
    enabled,
    queryFn: async (): Promise<{
      draft: EmployerOnboardingDraft;
      completion: number;
    } | null> => {
      await delay();
      const draft = getEmployerOnboardingDraftForUser();
      if (!draft) return null;
      return { draft, completion: computeEmployerCompletion(draft) };
    },
  });
}

/** Employer profile update mutation. Invalidates profile + dashboard caches. */
export function useUpdateEmployerProfile() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const userId = user?.id ?? "";

  return useMutation({
    mutationFn: async (payload: EmployerProfileUpdatePayload) => {
      await delay(200);
      const result = updateEmployerProfileForUser(payload);
      if (!result.success) {
        throw new Error(result.error ?? "Could not save changes.");
      }

      // Live backend sync
      updateEmployerProfileApi({
        displayName: payload.profile?.displayName,
        companyName: payload.organization?.name,
        companyDescription: payload.organization?.description || payload.profile?.about,
        industry: payload.organization?.industry || payload.profile?.industry,
        websiteUrl: payload.organization?.website || payload.profile?.website,
        location: payload.location?.city ? `${payload.location.city}, ${payload.location.state || ""}`.trim() : undefined,
        campusId: payload.location?.campusId,
      }).catch(() => {});

      return result;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: employerKeys.all,
      });
      void queryClient.invalidateQueries({
        queryKey: dashboardKeys.all,
      });
    },
  });
}
