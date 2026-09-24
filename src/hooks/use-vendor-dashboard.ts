"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { vendorDashboardKeys } from "@/lib/query-keys";
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

const STALE_MS = 30_000;

function useAuthenticated() {
  return useAuth().status === "authenticated";
}

export function useVendorProfile() {
  const enabled = useAuthenticated();
  return useQuery({
    queryKey: vendorDashboardKeys.profile(),
    queryFn: fetchVendorProfile,
    enabled,
    staleTime: STALE_MS,
  });
}

function useVendorAnalytics() {
  const enabled = useAuthenticated();
  return useQuery({
    queryKey: vendorDashboardKeys.analytics(),
    queryFn: fetchVendorAnalytics,
    enabled,
    staleTime: STALE_MS,
  });
}

function useVendorOrderStatus() {
  const enabled = useAuthenticated();
  return useQuery({
    queryKey: vendorDashboardKeys.orderStatus(),
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

export function useVendorRecentOrders(limit = 5) {
  const enabled = useAuthenticated();
  return useQuery({
    queryKey: vendorDashboardKeys.recentOrders(limit),
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
