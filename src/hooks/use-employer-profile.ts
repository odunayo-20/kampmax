"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { employerKeys, dashboardKeys } from "@/lib/query-keys";
import {
  backendProfileCompletion,
  backendProfileToDraft,
  getEmployerProfileApi,
  updateEmployerProfileApi,
} from "@/services/employer";
import type { EmployerOnboardingDraft, EmployerProfileUpdatePayload } from "@/types/employer";

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
      const { profile, error } = await getEmployerProfileApi();
      if (error) {
        if (error.status === 404) return null;
        throw error;
      }
      if (!profile) return null;
      return { draft: backendProfileToDraft(profile), completion: backendProfileCompletion(profile) };
    },
  });
}

/** Employer profile update mutation. Invalidates profile + dashboard caches. */
export function useUpdateEmployerProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: EmployerProfileUpdatePayload) => {
      const { error } = await updateEmployerProfileApi({
        displayName: payload.profile?.displayName,
        companyName: payload.organization?.name,
        companyDescription: payload.organization?.description || payload.profile?.about,
        industry: payload.organization?.industry || payload.profile?.industry,
        websiteUrl: payload.organization?.website || payload.profile?.website || undefined,
        city: payload.location?.city || undefined,
        state: payload.location?.state || undefined,
        campusId: payload.location?.campusId,
      });
      if (error) throw new Error(error.message || "Could not save changes.");
      return { success: true };
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
