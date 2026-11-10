"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import {
  getAgentDashboardAccessApi,
  type AgentAccess,
} from "@/services/agent-dashboard";

export const AGENT_DASHBOARD_QUERY_KEYS = {
  access: (userId?: string) => ["agent", "access", userId ?? "anon"] as const,
  overview: (userId?: string) => ["agent", "overview", userId ?? "anon"] as const,
};

export function useAgentAccess(options?: { enabled?: boolean }) {
  const { status, user } = useAuth();
  const enabled = (options?.enabled ?? true) && status === "authenticated";

  return useQuery<AgentAccess>({
    queryKey: AGENT_DASHBOARD_QUERY_KEYS.access(user?.id),
    queryFn: getAgentDashboardAccessApi,
    enabled,
    staleTime: 60_000,
  });
}

export function usePrefetchAgentDashboard(options?: { enabled?: boolean }) {
  const queryClient = useQueryClient();
  const { status, user } = useAuth();
  const enabled = (options?.enabled ?? true) && status === "authenticated";

  if (enabled) {
    queryClient.prefetchQuery({
      queryKey: AGENT_DASHBOARD_QUERY_KEYS.access(user?.id),
      queryFn: getAgentDashboardAccessApi,
      staleTime: 60_000,
    });
  }
}

