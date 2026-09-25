"use client";

import { useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import {
  applicationKeys,
  dashboardKeys,
  EmployerApplicationListQuery,
  jobKeys,
} from "@/lib/query-keys";
import {
  acceptProposalApi,
  getApplicationApi,
  getReceivedApplicationsApi,
  rejectProposalApi,
  shortlistProposalApi,
} from "@/services/proposals";
import { openDirectConversation } from "@/services/messages-api";
import type {
  EmployerApplicationStatus,
  EmployerApplicationsPage,
  EmployerApplicationSummary,
} from "@/types/opportunity";
import { APPLICATIONS_PAGE_SIZE } from "@/config/applications";

/** Mutations must THROW so TanStack Query's error/retry machinery works. */
function throwIfError(error: { message?: string; status?: number } | null): void {
  if (error) throw Object.assign(new Error(error.message ?? "Something went wrong."), error);
}

// ────────────────────────────────────────────────────────────────
// Employer reads (owner-scoped by the backend)
// ────────────────────────────────────────────────────────────────

/** Applications received across the employer's jobs (GET /proposals/received). */
export function useEmployerApplications(filters: EmployerApplicationListQuery) {
  const { status, user } = useAuth();
  const userId = user?.id ?? null;
  const enabled = status === "authenticated" && !!userId;

  return useQuery({
    queryKey: applicationKeys.list(userId ?? "", filters),
    enabled,
    queryFn: async (): Promise<EmployerApplicationsPage> => {
      const { page, error } = await getReceivedApplicationsApi({
        jobId: filters.jobId,
        status: filters.status,
        sort: filters.sort,
        search: filters.search,
        page: filters.page,
        size: filters.size ?? APPLICATIONS_PAGE_SIZE,
      });
      throwIfError(error);
      return page;
    },
  });
}

/**
 * One application. Non-existent and non-owned are indistinguishable (the
 * backend answers 404 for both), so this never reveals other employers'
 * candidates. Opening it also marks a new application as viewed.
 */
export function useEmployerApplication(id: string) {
  const { status, user } = useAuth();
  const userId = user?.id ?? null;
  const enabled = status === "authenticated" && !!userId && !!id;

  return useQuery({
    queryKey: applicationKeys.detail(userId ?? "", id),
    enabled,
    queryFn: async (): Promise<EmployerApplicationSummary> => {
      const { application, error } = await getApplicationApi(id);
      if (error || !application) {
        throw Object.assign(new Error("Application not found"), { code: "NOT_FOUND" });
      }
      return application;
    },
  });
}

/** Per-status counts for the employer's filter tabs. */
export function useEmployerApplicationsSummary() {
  const { status, user } = useAuth();
  const userId = user?.id ?? null;
  const enabled = status === "authenticated" && !!userId;

  return useQuery({
    queryKey: applicationKeys.summary(userId ?? ""),
    enabled,
    queryFn: async (): Promise<Record<EmployerApplicationStatus | "all", number>> => {
      const { page, error } = await getReceivedApplicationsApi({ size: 1 });
      throwIfError(error);
      return page.counts;
    },
  });
}

// ────────────────────────────────────────────────────────────────
// Employer mutations (status transitions are backend-owned)
// ────────────────────────────────────────────────────────────────

function invalidateApplicationData(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: applicationKeys.all });
  queryClient.invalidateQueries({ queryKey: dashboardKeys.all });
}

function invalidateApplicationAndJobs(queryClient: ReturnType<typeof useQueryClient>) {
  invalidateApplicationData(queryClient);
  queryClient.invalidateQueries({ queryKey: jobKeys.all });
}

/**
 * SUBMITTED → UNDER_REVIEW. The backend does this itself the first time the
 * employer opens an application, so this simply (re)fetches it.
 */
export function useReviewApplication() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      throwIfError((await getApplicationApi(id)).error);
    },
    onSuccess: () => invalidateApplicationData(queryClient),
  });
}

/** SUBMITTED | UNDER_REVIEW → SHORTLISTED */
export function useShortlistApplication() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      throwIfError((await shortlistProposalApi(id)).error);
    },
    onSuccess: () => invalidateApplicationData(queryClient),
  });
}

/** SUBMITTED | UNDER_REVIEW | SHORTLISTED → REJECTED (optional reason) */
export function useRejectApplication() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason?: string }): Promise<void> => {
      throwIfError((await rejectProposalApi(id, reason)).error);
    },
    onSuccess: () => invalidateApplicationData(queryClient),
  });
}

/**
 * Hire: → ACCEPTED, which also creates the engagement and expires the job's
 * other active proposals. Invalidates applications AND jobs.
 */
export function useAcceptApplication() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      throwIfError((await acceptProposalApi(id)).error);
    },
    onSuccess: () => invalidateApplicationAndJobs(queryClient),
  });
}

// ────────────────────────────────────────────────────────────────
// Candidate messaging
// ────────────────────────────────────────────────────────────────

/**
 * Resolves the direct conversation between the authenticated employer and a
 * candidate, creating it first if needed. Returns null when the candidate
 * can't be messaged (unauthenticated or an unknown user id).
 */
export function useCandidateConversation() {
  const { user } = useAuth();
  const senderId = user?.id ?? null;

  return useCallback(
    async (candidateId: string): Promise<string | null> => {
      if (!senderId) return null;
      try {
        return await openDirectConversation(candidateId);
      } catch {
        return null;
      }
    },
    [senderId]
  );
}
