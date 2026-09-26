"use client";

// TanStack Query wrappers over the service-provider moderation API.
// Mutations invalidate the whole ["admin", "service-providers"] tree so the
// list, counts and detail stay consistent.

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  serviceProviderManagementService as svc,
  type ServiceProviderListQuery,
} from "@/services/admin/service-provider-management.api";

const ROOT = ["admin", "service-providers"] as const;

export function useAdminServiceProviders(query: ServiceProviderListQuery) {
  return useQuery({
    queryKey: [...ROOT, "list", query],
    queryFn: () => svc.list(query),
  });
}

export function useAdminServiceProviderCounts() {
  return useQuery({
    queryKey: [...ROOT, "counts"],
    queryFn: () => svc.getCounts(),
  });
}

export function useAdminServiceProviderFilters() {
  return useQuery({
    queryKey: [...ROOT, "filters"],
    queryFn: () => svc.getFilters(),
    staleTime: 5 * 60_000,
  });
}

export function useAdminServiceProvider(id: string) {
  return useQuery({
    queryKey: [...ROOT, "detail", id],
    queryFn: () => svc.getById(id),
  });
}

function useInvalidatingMutation<V>(fn: (v: V) => Promise<unknown>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ROOT });
    },
  });
}

export const useAdminServiceProviderApprove = () =>
  useInvalidatingMutation((id: string) => svc.approve(id));

export const useAdminServiceProviderRestore = () =>
  useInvalidatingMutation((id: string) => svc.restore(id));

export const useAdminServiceProviderReject = () =>
  useInvalidatingMutation(({ id, reason }: { id: string; reason: string }) =>
    svc.reject(id, reason)
  );

export const useAdminServiceProviderSuspend = () =>
  useInvalidatingMutation(({ id, reason }: { id: string; reason: string }) =>
    svc.suspend(id, reason)
  );
