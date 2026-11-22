"use client";

// ============================================================
// ADMIN DASHBOARD HOOKS (Module 34)
//
// TanStack Query wrappers over the dashboard service. Keys are
// campus-scoped so a scoped operator's cache can never be reused as
// platform-wide data. All queries inherit the shared client defaults
// (staleTime 30s, focus refetch, capped retry backoff).
// ============================================================

import { useQuery } from "@tanstack/react-query";
import { adminKeys } from "@/lib/query-keys";
import { dashboardService } from "@/services/admin";
import type { ActivityFeedItem } from "@/types/admin";

export function useAdminDashboardOverview(scopeCampusId?: string | null) {
  return useQuery({
    queryKey: adminKeys.dashboard.overview(scopeCampusId),
    queryFn: () => dashboardService.getOverview(scopeCampusId ?? null),
  });
}

export function useAdminDashboardStats(scopeCampusId?: string | null) {
  return useQuery({
    queryKey: adminKeys.dashboard.stats(scopeCampusId),
    queryFn: () => dashboardService.getStats(scopeCampusId ?? null),
  });
}

export function useAdminDashboardTopProducts(limit = 6) {
  return useQuery({
    queryKey: adminKeys.dashboard.topProducts(limit),
    queryFn: () => dashboardService.getTopProducts(limit),
  });
}

export function useAdminDashboardLowStock(limit = 6) {
  return useQuery({
    queryKey: adminKeys.dashboard.lowStock(limit),
    queryFn: () => dashboardService.getLowStock(limit),
  });
}

export function useAdminDashboardRecentOrders(limit = 8) {
  return useQuery({
    queryKey: adminKeys.dashboard.recentOrders(limit),
    queryFn: () => dashboardService.getRecentOrders(limit),
  });
}

export function useAdminDashboardActivity(pageSize = 50) {
  return useQuery({
    queryKey: adminKeys.dashboard.activity(pageSize),
    queryFn: () =>
      dashboardService
        .getActivity({ pageSize })
        .then((p) => p.items as ActivityFeedItem[]),
  });
}