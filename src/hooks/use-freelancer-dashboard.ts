"use client";

import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { freelancerDashboardKeys } from "@/lib/query-keys";
import {
  getFreelancerDashboardAccessApi,
  getFreelancerDashboardApi,
} from "@/services/freelancer-dashboard";

/** How long freelancer access is trusted before a navigation triggers a quiet refresh. */
export const FREELANCER_ACCESS_STALE_MS = 60_000;

/**
 * Backend-authoritative dashboard access (GET /freelancers/me). One cached
 * request shared by the layout shell and every page, so navigating never
 * re-fetches it blocking the UI and the shell never unmounts.
 */
export function useFreelancerAccess({ enabled = true }: { enabled?: boolean } = {}) {
  const { status, user } = useAuth();
  return useQuery({
    queryKey: freelancerDashboardKeys.access(user?.id),
    queryFn: getFreelancerDashboardAccessApi,
    enabled: enabled && status === "authenticated",
    staleTime: FREELANCER_ACCESS_STALE_MS,
    // Fail fast to the gate screen; the user can retry from there.
    retry: false,
  });
}

/** Dashboard overview (profile, metrics, activity). */
export function useFreelancerDashboard() {
  const { status, user } = useAuth();
  return useQuery({
    queryKey: freelancerDashboardKeys.overview(user?.id),
    queryFn: getFreelancerDashboardApi,
    enabled: status === "authenticated",
    staleTime: 30_000,
  });
}
