"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { dashboardAccessKeys, vendorDashboardKeys } from "@/lib/query-keys";
import { getVendorDashboardAccessApi } from "@/services/vendor-dashboard";
import {
  buildActionRequired,
  buildDashboardOverview,
  buildStoreHealth,
  fetchLowStockProducts,
  fetchVendorAnalytics,
  fetchVendorOrderStatusCounts,
  fetchVendorProfile,
  fetchVendorRecentOrders,
  restockProduct,
} from "@/services/vendor-dashboard-api";
import type { Product } from "@/types";
import { useDashboardAccess, usePrefetchDashboardQueries } from "./use-dashboard-access";

const STALE_MS = 30_000;

/** Whether the vendor queries may run, and the user id their cache keys carry. */
function useVendorSession() {
  const { status, user } = useAuth();
  return { enabled: status === "authenticated", userId: user?.id };
}

/** Backend-authoritative dashboard access (vendor profile + approval state). */
export function useVendorAccess() {
  const { user } = useAuth();
  return useDashboardAccess({
    queryKey: dashboardAccessKeys.vendor(user?.id),
    revalidateKey: dashboardAccessKeys.vendorAll,
    queryFn: getVendorDashboardAccessApi,
  });
}

const RECENT_ORDERS_LIMIT = 5;

// What the overview page reads first (see `useVendorOverview` and its widgets).
const vendorOverviewQueries = (userId: string | undefined) => [
  { queryKey: vendorDashboardKeys.profile(userId), queryFn: fetchVendorProfile },
  { queryKey: vendorDashboardKeys.analytics(userId), queryFn: fetchVendorAnalytics },
  { queryKey: vendorDashboardKeys.orderStatus(userId), queryFn: fetchVendorOrderStatusCounts },
  {
    queryKey: vendorDashboardKeys.recentOrders(userId, RECENT_ORDERS_LIMIT),
    queryFn: () => fetchVendorRecentOrders(RECENT_ORDERS_LIMIT),
  },
];

/** Warms the overview metrics while the access check runs. */
export function usePrefetchVendorDashboard({ enabled }: { enabled: boolean }) {
  usePrefetchDashboardQueries({ enabled, queries: vendorOverviewQueries });
}

export function useVendorProfile() {
  const { enabled, userId } = useVendorSession();
  return useQuery({
    queryKey: vendorDashboardKeys.profile(userId),
    queryFn: fetchVendorProfile,
    enabled,
    staleTime: STALE_MS,
  });
}

function useVendorAnalytics() {
  const { enabled, userId } = useVendorSession();
  return useQuery({
    queryKey: vendorDashboardKeys.analytics(userId),
    queryFn: fetchVendorAnalytics,
    enabled,
    staleTime: STALE_MS,
  });
}

function useVendorOrderStatus() {
  const { enabled, userId } = useVendorSession();
  return useQuery({
    queryKey: vendorDashboardKeys.orderStatus(userId),
    queryFn: fetchVendorOrderStatusCounts,
    enabled,
    staleTime: STALE_MS,
  });
}

export function useVendorOverview() {
  const analytics = useVendorAnalytics();
  const statuses = useVendorOrderStatus();
  return {
    data:
      analytics.data && statuses.data
        ? buildDashboardOverview(analytics.data, statuses.data)
        : undefined,
    isPending: analytics.isPending || statuses.isPending,
    isError: analytics.isError || statuses.isError,
    refetch: () => Promise.all([analytics.refetch(), statuses.refetch()]),
  };
}

export function useVendorRecentOrders(limit = RECENT_ORDERS_LIMIT) {
  const { enabled, userId } = useVendorSession();
  return useQuery({
    queryKey: vendorDashboardKeys.recentOrders(userId, limit),
    queryFn: () => fetchVendorRecentOrders(limit),
    enabled,
    staleTime: STALE_MS,
  });
}

export function useVendorLowStock() {
  const { data: profile } = useVendorProfile();
  const vendorId = profile?.id ?? "";
  return useQuery({
    queryKey: vendorDashboardKeys.lowStock(vendorId),
    queryFn: () => fetchLowStockProducts(vendorId),
    enabled: Boolean(vendorId),
    staleTime: STALE_MS,
  });
}

export function useVendorStoreHealth() {
  const profile = useVendorProfile();
  const analytics = useVendorAnalytics();
  return {
    data:
      profile.data && analytics.data
        ? buildStoreHealth(profile.data, analytics.data.overview.activeProducts)
        : undefined,
    isPending: profile.isPending || analytics.isPending,
    isError: profile.isError || analytics.isError,
  };
}

export function useVendorActionRequired() {
  const profile = useVendorProfile();
  const statuses = useVendorOrderStatus();
  const lowStock = useVendorLowStock();
  return {
    data:
      profile.data && statuses.data
        ? buildActionRequired(profile.data, statuses.data, lowStock.data?.length ?? 0)
        : undefined,
    isPending: profile.isPending || statuses.isPending,
    isError: profile.isError || statuses.isError,
  };
}

export function useRestockProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ product, quantity }: { product: Product; quantity: number }) =>
      restockProduct(product, quantity),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: vendorDashboardKeys.all });
    },
  });
}
