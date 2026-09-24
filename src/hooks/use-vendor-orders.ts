"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { vendorDashboardKeys, vendorOrderKeys } from "@/lib/query-keys";
import {
  fetchVendorOrder,
  fetchVendorOrderCounts,
  fetchVendorOrders,
  TRANSITION_TARGET,
  transitionVendorOrder,
  type VendorOrderTransitionKey,
} from "@/services/vendor-orders-api";
import type { VendorFulfillmentStatus } from "@/types/vendor-orders";

const STALE_MS = 15_000;

export function useVendorOrders(filters: {
  search?: string;
  fulfillmentStatus: VendorFulfillmentStatus | "all";
  page: number;
  pageSize: number;
}) {
  const enabled = useAuth().status === "authenticated";
  return useQuery({
    queryKey: vendorOrderKeys.list({
      search: filters.search,
      status: filters.fulfillmentStatus,
      page: filters.page,
    }),
    queryFn: () => fetchVendorOrders(filters),
    enabled,
    staleTime: STALE_MS,
    placeholderData: keepPreviousData,
  });
}

export function useVendorOrderCounts() {
  const enabled = useAuth().status === "authenticated";
  return useQuery({
    queryKey: vendorOrderKeys.counts(),
    queryFn: fetchVendorOrderCounts,
    enabled,
    staleTime: STALE_MS,
  });
}

export function useVendorOrder(id: string) {
  const enabled = useAuth().status === "authenticated";
  return useQuery({
    queryKey: vendorOrderKeys.detail(id),
    queryFn: () => fetchVendorOrder(id),
    enabled,
    staleTime: STALE_MS,
  });
}

export function useVendorOrderTransition(orderId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ action, note }: { action: VendorOrderTransitionKey; note?: string }) =>
      transitionVendorOrder(orderId, TRANSITION_TARGET[action], note),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: vendorOrderKeys.all });
      queryClient.invalidateQueries({ queryKey: vendorDashboardKeys.all });
    },
  });
}
