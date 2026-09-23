"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { EmployerJobListQuery, JobListQuery, dashboardKeys, jobKeys } from "@/lib/query-keys";
import { closeJobApi, createJobApi, getJobByIdApi, getMyJobsApi, getSavedJobsForUser, publishJobApi, saveJobForUser, unsaveJobForUser, updateJobApi } from "@/services/opportunity";
import { getJobById, listPublicJobs } from "@/services/jobs";
import { jobListFiltersToQuery, jobToOpportunity } from "@/lib/job-api-mapping";
import type { Opportunity, OpportunityInput, OpportunityPage, OpportunityResult, OpportunityStatus } from "@/types/opportunity";
import { JOBS_PAGE_SIZE } from "@/config/jobs";

function throwIfNotOk(result: OpportunityResult): void {
  if (!result.ok) throw Object.assign(new Error(result.message), { code: result.code });
}

function throwIfJobError<T>(result: { job: T | null; error: Error | null }): T {
  if (result.error || result.job === null) throw result.error ?? new Error("The backend returned no data.");
  return result.job;
}

/**
 * Public job browsing/detail hit the real backend (GET /jobs, GET
 * /jobs/:id) via services/jobs.ts + lib/job-api-mapping.ts. Employer job
 * authoring (below) still targets the mock store — see the module header
 * of lib/job-api-mapping.ts for why the write side isn't wired yet
 * (skill-id resolution, budget/experience vocabulary reconciliation).
 */
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

export function useSavedJobIds() {
  const { status, user } = useAuth();
  const userId = user?.id ?? "";
  return useQuery({ queryKey: jobKeys.saved(userId), enabled: status === "authenticated" && !!userId, queryFn: async () => getSavedJobsForUser().map((job) => job.id) });
}

export function useSaveJob() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({ mutationFn: async (jobId: string): Promise<void> => { const result = saveJobForUser(jobId); throwIfNotOk(result); }, onSuccess: () => { if (user?.id) void queryClient.invalidateQueries({ queryKey: jobKeys.saved(user.id) }); } });
}

export function useUnsaveJob() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({ mutationFn: async (jobId: string): Promise<void> => { const result = unsaveJobForUser(jobId); throwIfNotOk(result); }, onSuccess: () => { if (user?.id) void queryClient.invalidateQueries({ queryKey: jobKeys.saved(user.id) }); } });
}

export function useEmployerJobs(filters: EmployerJobListQuery) {
  const { status, user } = useAuth();
  const userId = user?.id ?? "";
  return useQuery({
    queryKey: jobKeys.employerList(userId, filters),
    enabled: status === "authenticated" && !!userId,
    queryFn: async (): Promise<OpportunityPage> => {
      const response = await getMyJobsApi(filters.page, filters.size);
      if (response.error || !response.result) throw response.error ?? new Error("The backend returned no jobs.");
      return { items: response.result.data as unknown as Opportunity[], total: response.result.total, page: response.result.page, size: response.result.limit, totalPages: response.result.totalPages };
    },
  });
}

export function useEmployerJob(id: string) {
  const { status, user } = useAuth();
  const userId = user?.id ?? "";
  return useQuery({ queryKey: jobKeys.employerDetail(userId, id), enabled: status === "authenticated" && !!userId && !!id, queryFn: async (): Promise<Opportunity> => throwIfJobError(await getJobByIdApi(id)) as unknown as Opportunity });
}

export function useEmployerJobsSummary() {
  const { status, user } = useAuth();
  const userId = user?.id ?? "";
  return useQuery({
    queryKey: jobKeys.employerCounts(userId),
    enabled: status === "authenticated" && !!userId,
    queryFn: async (): Promise<Record<OpportunityStatus, number> & { all: number }> => {
      const response = await getMyJobsApi(1, 100);
      if (response.error || !response.result) throw response.error ?? new Error("The backend returned no jobs.");
      const counts = { draft: 0, pending_review: 0, open: 0, closed: 0, expired: 0, cancelled: 0, all: response.result.total };
      for (const job of response.result.data) if (job.status in counts) counts[job.status as keyof typeof counts] += 1;
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
  return useMutation({ mutationFn: async (input: OpportunityInput) => throwIfJobError(await createJobApi(input)) as unknown as Opportunity, onSuccess: () => invalidateAllJobs(queryClient) });
}

export function useUpdateJob() {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: async ({ id, input }: { id: string; input: OpportunityInput }) => throwIfJobError(await updateJobApi(id, input)) as unknown as Opportunity, onSuccess: () => invalidateAllJobs(queryClient) });
}

export function usePublishJob() {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: async (id: string) => throwIfJobError(await publishJobApi(id)) as unknown as Opportunity, onSuccess: () => invalidateAllJobs(queryClient) });
}

export function useCloseJob() {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: async (id: string) => throwIfJobError(await closeJobApi(id)) as unknown as Opportunity, onSuccess: () => invalidateAllJobs(queryClient) });
}
