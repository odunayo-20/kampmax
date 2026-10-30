"use client";

import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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

const FREELANCER_OVERVIEW_STALE_MS = 30_000;

/** Dashboard overview (profile, metrics, activity). */
export function useFreelancerDashboard() {
  const { status, user } = useAuth();
  return useQuery({
    queryKey: freelancerDashboardKeys.overview(user?.id),
    queryFn: getFreelancerDashboardApi,
    enabled: status === "authenticated",
    staleTime: FREELANCER_OVERVIEW_STALE_MS,
  });
}

/**
 * Starts loading the dashboard overview before the page that shows it mounts.
 *
 * The layout holds the page back until the access check passes, so without this the
 * overview request would only start after that check. With it, both run side by
 * side and the page's `useFreelancerDashboard()` picks up the request in flight.
 * Pass `enabled: false` on pages that don't show the overview.
 */
export function usePrefetchFreelancerDashboard({ enabled }: { enabled: boolean }) {
  const { status, user } = useAuth();
  const queryClient = useQueryClient();
  const userId = user?.id;

  useEffect(() => {
    if (!enabled || status !== "authenticated") return;
    void queryClient.prefetchQuery({
      queryKey: freelancerDashboardKeys.overview(userId),
      queryFn: getFreelancerDashboardApi,
      staleTime: FREELANCER_OVERVIEW_STALE_MS,
    });
  }, [enabled, status, userId, queryClient]);
}
