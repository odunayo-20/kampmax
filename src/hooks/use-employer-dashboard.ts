"use client";

import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { dashboardKeys } from "@/lib/query-keys";
import {
  getEmployerContractsApi,
  getEmployerDashboardApi,
} from "@/services/employer-dashboard";
import type { EmployerDashboardContract, EmployerDashboardSummary } from "@/services/employer-dashboard";

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
