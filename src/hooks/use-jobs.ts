"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { EmployerJobListQuery, JobListQuery, dashboardKeys, jobKeys } from "@/lib/query-keys";
import {
  closeJobApi,
  createJobApi,
  getMyJobByIdApi,
  getMyJobCountsApi,
  getMyJobsApi,
  publishJobApi,
  updateJobApi,
} from "@/services/opportunity";
import { getJobById, listPublicJobs, listSavedJobIds, saveJob, unsaveJob } from "@/services/jobs";
import { jobListFiltersToQuery, jobToOpportunity } from "@/lib/job-api-mapping";
import type { Opportunity, OpportunityInput, OpportunityPage, OpportunityStatus } from "@/types/opportunity";
import { JOBS_PAGE_SIZE } from "@/config/jobs";

function throwIfJobError<T>(result: { job: T | null; error: { message?: string } | null }): T {
  if (result.error || result.job === null) {
    throw Object.assign(new Error(result.error?.message ?? "The backend returned no data."), result.error ?? {});
  }
  return result.job;
}

/** Public job browsing/detail: GET /jobs and GET /jobs/:id. */
export function useJobs(filters: JobListQuery) {
  const { status } = useAuth();
  return useQuery({
    queryKey: jobKeys.list(filters),
    enabled: status === "authenticated",
    queryFn: async (): Promise<OpportunityPage> => {
      const query = jobListFiltersToQuery({ ...filters, size: filters.size ?? JOBS_PAGE_SIZE });
      const { jobs, total, page, totalPages, error } = await listPublicJobs(query);
      if (error) throw error;
      return {
        items: jobs.map(jobToOpportunity),
        total,
        page,
        size: filters.size ?? JOBS_PAGE_SIZE,
        totalPages,
      };
    },
  });
}

export function useJob(id: string) {
  const { status } = useAuth();
  return useQuery({
    queryKey: jobKeys.detail(id),
    enabled: status === "authenticated" && !!id,
    queryFn: async (): Promise<Opportunity> => {
      const { job, error } = await getJobById(id);
      if (error || !job) throw error ?? new Error("Job not found");
      return jobToOpportunity(job);
    },
  });
}

// ── Saved jobs (backend: /jobs/saved, /jobs/:id/save) ────────

export function useSavedJobIds() {
  const { status, user } = useAuth();
  const userId = user?.id ?? "";
  return useQuery({
    queryKey: jobKeys.saved(userId),
    enabled: status === "authenticated" && !!userId,
    queryFn: async (): Promise<string[]> => {
      const { ids, error } = await listSavedJobIds();
      if (error) throw error;
      return ids;
    },
  });
}

export function useSaveJob() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (jobId: string): Promise<void> => {
      const { error } = await saveJob(jobId);
      if (error) throw error;
    },
    onSuccess: () => {
      if (user?.id) void queryClient.invalidateQueries({ queryKey: jobKeys.saved(user.id) });
    },
  });
}

export function useUnsaveJob() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (jobId: string): Promise<void> => {
      const { error } = await unsaveJob(jobId);
      if (error) throw error;
    },
    onSuccess: () => {
      if (user?.id) void queryClient.invalidateQueries({ queryKey: jobKeys.saved(user.id) });
    },
  });
}

// ── Employer job management (backend: /jobs/me, /jobs) ───────

export function useEmployerJobs(filters: EmployerJobListQuery) {
  const { status, user } = useAuth();
  const userId = user?.id ?? "";
  return useQuery({
    queryKey: jobKeys.employerList(userId, filters),
    enabled: status === "authenticated" && !!userId,
    queryFn: async (): Promise<OpportunityPage> => {
      const { page, error } = await getMyJobsApi(
        filters.page,
        filters.size,
        filters.status as OpportunityStatus | "all" | undefined
      );
      if (error) throw error;
      return page;
    },
  });
}

export function useEmployerJob(id: string) {
  const { status, user } = useAuth();
  const userId = user?.id ?? "";
  return useQuery({
    queryKey: jobKeys.employerDetail(userId, id),
    enabled: status === "authenticated" && !!userId && !!id,
    queryFn: async (): Promise<Opportunity> => throwIfJobError(await getMyJobByIdApi(id)),
  });
}

export function useEmployerJobsSummary() {
  const { status, user } = useAuth();
  const userId = user?.id ?? "";
  return useQuery({
    queryKey: jobKeys.employerCounts(userId),
    enabled: status === "authenticated" && !!userId,
    queryFn: async (): Promise<Record<OpportunityStatus, number> & { all: number }> => {
      const { counts, error } = await getMyJobCountsApi();
      if (error) throw error;
      return counts;
    },
  });
}

function invalidateAllJobs(queryClient: ReturnType<typeof useQueryClient>) {
  void queryClient.invalidateQueries({ queryKey: jobKeys.all });
  void queryClient.invalidateQueries({ queryKey: dashboardKeys.all });
}

export function useCreateJob() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: OpportunityInput) => throwIfJobError(await createJobApi(input)),
    onSuccess: () => invalidateAllJobs(queryClient),
  });
}

export function useUpdateJob() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: OpportunityInput }) =>
      throwIfJobError(await updateJobApi(id, input)),
    onSuccess: () => invalidateAllJobs(queryClient),
  });
}

export function usePublishJob() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => throwIfJobError(await publishJobApi(id)),
    onSuccess: () => invalidateAllJobs(queryClient),
  });
}

export function useCloseJob() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => throwIfJobError(await closeJobApi(id)),
    onSuccess: () => invalidateAllJobs(queryClient),
  });
}
