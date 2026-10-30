"use client";

import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { dashboardAccessKeys, serviceProviderDashboardKeys } from "@/lib/query-keys";
import {
  computeProfileCompletionFromLive,
  fetchSpDashboardLive,
  fetchSpReviewsSummaryLive,
  getServiceProviderDashboardAccessApi,
} from "@/services/service-provider-dashboard";
import { useDashboardAccess, usePrefetchDashboardQueries } from "./use-dashboard-access";

/** Backend-authoritative dashboard access (GET /service-provider/profile/me). */
export function useServiceProviderAccess({ enabled = true }: { enabled?: boolean } = {}) {
  const { user } = useAuth();
  return useDashboardAccess({
    queryKey: dashboardAccessKeys.serviceProvider(user?.id),
    revalidateKey: dashboardAccessKeys.serviceProviderAll,
    queryFn: getServiceProviderDashboardAccessApi,
    enabled,
  });
}

/** Overview (profile record, metrics, activity) plus the profile completion derived from it. */
export function useServiceProviderDashboard() {
  const { status, user } = useAuth();
  return useQuery({
    queryKey: serviceProviderDashboardKeys.overview(user?.id),
    queryFn: fetchSpDashboardLive,
    enabled: status === "authenticated",
    select: (live) => ({ ...live, completion: computeProfileCompletionFromLive(live.record) }),
  });
}

/**
 * Ratings card data. It's optional: when it can't load, the rest of the page still
 * works and the card is simply left out, so don't retry and don't surface the error.
 */
export function useServiceProviderReviewsSummary() {
  const { status, user } = useAuth();
  return useQuery({
    queryKey: serviceProviderDashboardKeys.reviewsSummary(user?.id),
    queryFn: fetchSpReviewsSummaryLive,
    enabled: status === "authenticated",
    retry: false,
  });
}

const serviceProviderOverviewQueries = (userId: string | undefined) => [
  { queryKey: serviceProviderDashboardKeys.overview(userId), queryFn: fetchSpDashboardLive },
  { queryKey: serviceProviderDashboardKeys.reviewsSummary(userId), queryFn: fetchSpReviewsSummaryLive },
];

/** Warms the overview while the access check runs. */
export function usePrefetchServiceProviderDashboard({ enabled }: { enabled: boolean }) {
  usePrefetchDashboardQueries({ enabled, queries: serviceProviderOverviewQueries });
}
