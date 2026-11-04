"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { cvKeys, dashboardKeys, jobApplicationKeys } from "@/lib/query-keys";
import {
  applyToJob,
  deleteCv,
  listCvs,
  listJobApplicants,
  listMyApplications,
  renameCv,
  setApplicationStatus,
  uploadCv,
  withdrawApplication,
  type ApplicationDecision,
  type ApplicationStatus,
  type ApplyInput,
  type Cv,
  type JobApplicants,
  type MyApplication,
} from "@/services/job-applications";
import { APPLICANTS_PAGE_SIZE, APPLICATIONS_PAGE_SIZE } from "@/config/cv";

/** A failure from a service call, thrown so React Query can show its message. */
function fail(error: { message?: string } | null, fallback: string): never {
  throw Object.assign(new Error(error?.message ?? fallback), error ?? {});
}

// ── CV library ──────────────────────────────────────────────

export function useCvs() {
  const { status, user } = useAuth();
  const userId = user?.id ?? "";
  return useQuery({
    queryKey: cvKeys.list(userId),
    enabled: status === "authenticated" && !!userId,
    queryFn: async (): Promise<Cv[]> => {
      const { cvs, error } = await listCvs();
      if (error) throw error;
      return cvs;
    },
  });
}

export function useUploadCv() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ file, label }: { file: File; label?: string }): Promise<Cv> => {
      const { cv, error } = await uploadCv(file, label);
      if (error || !cv) fail(error, "The CV could not be uploaded.");
      return cv;
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: cvKeys.all }),
  });
}

export function useRenameCv() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, label }: { id: string; label: string }): Promise<Cv> => {
      const { cv, error } = await renameCv(id, label);
      if (error || !cv) fail(error, "The CV could not be renamed.");
      return cv;
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: cvKeys.all }),
  });
}

export function useDeleteCv() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string): Promise<{ fileKept: boolean }> => {
      const { fileKept, error } = await deleteCv(id);
      if (error) throw error;
      return { fileKept };
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: cvKeys.all }),
  });
}

// ── Applying ────────────────────────────────────────────────

/** My application to one posting (the live one; a withdrawn one does not count). */
export function useMyApplicationForJob(jobId: string, enabled = true) {
  const { status, user } = useAuth();
  const userId = user?.id ?? "";
  return useQuery({
    queryKey: jobApplicationKeys.mineForJob(userId, jobId),
    enabled: enabled && status === "authenticated" && !!userId && !!jobId,
    queryFn: async (): Promise<MyApplication | null> => {
      const { applications, error } = await listMyApplications({ jobId, limit: 5 });
      if (error) throw error;
      return applications.find((a) => a.status !== "WITHDRAWN") ?? null;
    },
  });
}

export function useApplyToJob(jobId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: ApplyInput): Promise<MyApplication> => {
      const { application, error } = await applyToJob(jobId, input);
      if (error || !application) fail(error, "Your application could not be sent.");
      return application;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: jobApplicationKeys.all });
      // Applying attaches a CV to an application: its count changes.
      void queryClient.invalidateQueries({ queryKey: cvKeys.all });
    },
  });
}

export function useMyApplications(page: number) {
  const { status, user } = useAuth();
  const userId = user?.id ?? "";
  return useQuery({
    queryKey: jobApplicationKeys.mine(userId, page),
    enabled: status === "authenticated" && !!userId,
    queryFn: async () => {
      const result = await listMyApplications({ page, limit: APPLICATIONS_PAGE_SIZE });
      if (result.error) throw result.error;
      return result;
    },
  });
}

export function useWithdrawApplication() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string): Promise<MyApplication> => {
      const { application, error } = await withdrawApplication(id);
      if (error || !application) fail(error, "The application could not be withdrawn.");
      return application;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: jobApplicationKeys.all });
      void queryClient.invalidateQueries({ queryKey: cvKeys.all });
    },
  });
}

// ── Employer ────────────────────────────────────────────────

export function useJobApplicants(
  jobId: string,
  filters: { status?: ApplicationStatus; page: number }
) {
  const { status, user } = useAuth();
  const userId = user?.id ?? "";
  return useQuery({
    queryKey: jobApplicationKeys.forJob(userId, jobId, filters.status ?? "all", filters.page),
    enabled: status === "authenticated" && !!userId && !!jobId,
    queryFn: async (): Promise<JobApplicants> => {
      const { result, error } = await listJobApplicants(jobId, {
        status: filters.status,
        page: filters.page,
        limit: APPLICANTS_PAGE_SIZE,
      });
      if (error || !result) throw error ?? new Error("The backend returned no data.");
      return result;
    },
  });
}

export function useSetApplicationStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      status,
      note,
    }: {
      id: string;
      status: ApplicationDecision;
      note?: string;
    }) => {
      const { applicant, error } = await setApplicationStatus(id, status, note);
      if (error || !applicant) fail(error, "The decision could not be saved.");
      return applicant;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: jobApplicationKeys.all });
      void queryClient.invalidateQueries({ queryKey: dashboardKeys.all });
    },
  });
}
