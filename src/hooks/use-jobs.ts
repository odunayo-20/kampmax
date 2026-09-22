"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { EmployerJobListQuery, JobListQuery, dashboardKeys, jobKeys } from "@/lib/query-keys";
import { closeJobApi, createJobApi, getJobByIdApi, getMyJobsApi, getOpportunitiesPageApi, getSavedJobsForUser, publishJobApi, saveJobForUser, unsaveJobForUser, updateJobApi } from "@/services/opportunity";
import type { Opportunity, OpportunityInput, OpportunityPage, OpportunityResult, OpportunityStatus } from "@/types/opportunity";
import { JOBS_PAGE_SIZE } from "@/config/jobs";

function throwIfNotOk(result: OpportunityResult): void {
  if (!result.ok) throw Object.assign(new Error(result.message), { code: result.code });
}

function throwIfApiError<T>(result: { data: T | null; error: Error | null }): T {
  if (result.error || result.data === null) throw result.error ?? new Error("The backend returned no data.");
  return result.data;
}

export function useJobs(filters: JobListQuery) {
  const { status } = useAuth();
  return useQuery({
    queryKey: jobKeys.list(filters),
    enabled: status === "authenticated",
    queryFn: async (): Promise<OpportunityPage> => {
      const response = await getOpportunitiesPageApi({ search: filters.search, categoryId: filters.categoryId, experience: filters.experience, arrangement: filters.arrangement as never, sort: filters.sort as never, page: filters.page, size: filters.size ?? JOBS_PAGE_SIZE });
      if (response.error) throw response.error;
      return response.page;
    },
  });
}

export function useJob(id: string) {
  const { status } = useAuth();
  return useQuery({
    queryKey: jobKeys.detail(id),
    enabled: status === "authenticated" && !!id,
    queryFn: async (): Promise<Opportunity> => throwIfApiError(await getJobByIdApi(id)) as unknown as Opportunity,
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
  return useMutation({ mutationFn: (jobId: string) => { const result = saveJobForUser(jobId); throwIfNotOk(result); }, onSuccess: () => { if (user?.id) void queryClient.invalidateQueries({ queryKey: jobKeys.saved(user.id) }); } });
}

export function useUnsaveJob() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({ mutationFn: (jobId: string) => { const result = unsaveJobForUser(jobId); throwIfNotOk(result); }, onSuccess: () => { if (user?.id) void queryClient.invalidateQueries({ queryKey: jobKeys.saved(user.id) }); } });
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
  return useQuery({ queryKey: jobKeys.employerDetail(userId, id), enabled: status === "authenticated" && !!userId && !!id, queryFn: async (): Promise<Opportunity> => throwIfApiError(await getJobByIdApi(id)) as unknown as Opportunity });
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
  return useMutation({ mutationFn: async (input: OpportunityInput) => throwIfApiError(await createJobApi(input)) as unknown as Opportunity, onSuccess: () => invalidateAllJobs(queryClient) });
}

export function useUpdateJob() {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: async ({ id, input }: { id: string; input: OpportunityInput }) => throwIfApiError(await updateJobApi(id, input)) as unknown as Opportunity, onSuccess: () => invalidateAllJobs(queryClient) });
}

export function usePublishJob() {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: async (id: string) => throwIfApiError(await publishJobApi(id)) as unknown as Opportunity, onSuccess: () => invalidateAllJobs(queryClient) });
}

export function useCloseJob() {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: async (id: string) => throwIfApiError(await closeJobApi(id)) as unknown as Opportunity, onSuccess: () => invalidateAllJobs(queryClient) });
}
