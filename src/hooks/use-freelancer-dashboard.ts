"use client";

import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { freelancerDashboardKeys } from "@/lib/query-keys";
import {
  getFreelancerDashboardAccessApi,
  getFreelancerDashboardApi,
} from "@/services/freelancer-dashboard";
import { useDashboardAccess, usePrefetchDashboardQueries } from "./use-dashboard-access";

const FREELANCER_OVERVIEW_STALE_MS = 30_000;

/** Backend-authoritative dashboard access (GET /freelancers/me). */
export function useFreelancerAccess({ enabled = true }: { enabled?: boolean } = {}) {
  const { user } = useAuth();
  return useDashboardAccess({
    queryKey: freelancerDashboardKeys.access(user?.id),
    revalidateKey: freelancerDashboardKeys.accessAll,
    queryFn: getFreelancerDashboardAccessApi,
    enabled,
  });
}

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

const freelancerOverviewQueries = (userId: string | undefined) => [
  { queryKey: freelancerDashboardKeys.overview(userId), queryFn: getFreelancerDashboardApi },
];

/** Warms the overview while the access check runs. See `usePrefetchDashboardQueries`. */
export function usePrefetchFreelancerDashboard({ enabled }: { enabled: boolean }) {
  usePrefetchDashboardQueries({ enabled, queries: freelancerOverviewQueries });
}
