"use client";

// ============================================================
// ADMIN JOB MODERATION HOOKS
// ============================================================
//
// Reports on live postings and applicants, and a moderator's audited look at
// an application. Reading an application is logged on the server every time it
// is fetched, so the query is never refetched on its own (no refocus, no
// retry) and the private note and answers are dropped from the cache as soon
// as the dialog closes.
// ============================================================

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminKeys, jobKeys } from "@/lib/query-keys";
import { jobModerationService } from "@/services/admin";
import type { JobReportsQuery } from "@/services/admin/job-moderation.service";
import { cvLinkUrl } from "@/services/job-applications";
import type { ResolveReportInput } from "@/types/job-moderation";

export function useAdminJobReports(query: JobReportsQuery) {
  return useQuery({
    queryKey: adminKeys.jobReports.list(query),
    queryFn: () => jobModerationService.listReports(query),
  });
}

export function useAdminJobReport(id: string) {
  return useQuery({
    queryKey: adminKeys.jobReports.detail(id),
    enabled: !!id,
    queryFn: () => jobModerationService.getReport(id),
  });
}

/** Dismiss a report, take its posting down (optionally refunding), or remove the application. */
export function useResolveJobReport(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ResolveReportInput) => jobModerationService.resolveReport(id, input),
    onSuccess: () => {
      // The queue, every admin job view, the public jobs, and the employer's billing change.
      void queryClient.invalidateQueries({ queryKey: adminKeys.all });
      void queryClient.invalidateQueries({ queryKey: jobKeys.all });
      void queryClient.invalidateQueries({ queryKey: ["posting-billing"] });
      void queryClient.invalidateQueries({ queryKey: ["wallet"] });
    },
  });
}

/** What an applicant sent: the note and answers. Fetched once per opening, and logged server-side. */
export function useAdminApplication(id: string | null) {
  return useQuery({
    queryKey: adminKeys.jobReports.application(id ?? ""),
    enabled: !!id,
    queryFn: () => jobModerationService.getApplication(id as string),
    staleTime: 0,
    gcTime: 0,
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
}

/**
 * Asks for a fresh few-minutes link and starts the download. Made at the moment
 * of the click and used straight away; the server logs each one.
 */
export async function openApplicationCv(id: string): Promise<{ error: string | null }> {
  try {
    const link = await jobModerationService.getApplicationCvLink(id);
    window.location.assign(cvLinkUrl(link));
    return { error: null };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "The CV could not be opened." };
  }
}
