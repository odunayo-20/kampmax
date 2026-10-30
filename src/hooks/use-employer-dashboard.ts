"use client";

import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { dashboardAccessKeys, dashboardKeys } from "@/lib/query-keys";
import { getEmployerDashboardAccessApi } from "@/services/employer";
import {
  getEmployerContractsApi,
  getEmployerDashboardApi,
} from "@/services/employer-dashboard";
import type { EmployerDashboardContract, EmployerDashboardSummary } from "@/services/employer-dashboard";
import { useDashboardAccess, usePrefetchDashboardQueries } from "./use-dashboard-access";

/** Backend-authoritative dashboard access (GET /employers/me). */
export function useEmployerAccess({ enabled = true }: { enabled?: boolean } = {}) {
  const { user } = useAuth();
  return useDashboardAccess({
    queryKey: dashboardAccessKeys.employer(user?.id),
    revalidateKey: dashboardAccessKeys.employerAll,
    queryFn: getEmployerDashboardAccessApi,
    enabled,
  });
}

const employerSummaryQueries = (userId: string | undefined) => [
  { queryKey: dashboardKeys.summary(userId ?? ""), queryFn: getEmployerDashboardApi },
];

/** Warms the command-center summary while the access check runs. */
export function usePrefetchEmployerDashboard({ enabled }: { enabled: boolean }) {
  usePrefetchDashboardQueries({ enabled, queries: employerSummaryQueries });
}

/** Employer command center, composed from the real owner-scoped endpoints. */
export function useEmployerDashboardSummary() {
  const { status, user } = useAuth();
  const userId = user?.id ?? null;
  const enabled = status === "authenticated" && !!userId;

  return useQuery({
    queryKey: dashboardKeys.summary(userId ?? ""),
    enabled,
    queryFn: async (): Promise<EmployerDashboardSummary | null> => getEmployerDashboardApi(),
  });
}

/** The employer's engagements for /employer/contracts. */
export function useEmployerContracts() {
  const { status, user } = useAuth();
  const userId = user?.id ?? null;
  const enabled = status === "authenticated" && !!userId;

  return useQuery({
    queryKey: dashboardKeys.contracts(userId ?? ""),
    enabled,
    queryFn: async (): Promise<EmployerDashboardContract[]> => getEmployerContractsApi(),
  });
}
