"use client";

import { useMutation } from "@tanstack/react-query";
import {
  reportApplicant,
  reportPosting,
  type ReportReceipt,
} from "@/services/job-reports";
import type { ReportInput } from "@/types/job-moderation";

/** A failure from a service call, thrown so React Query can show its message. */
function fail(error: { message?: string } | null, fallback: string): never {
  throw Object.assign(new Error(error?.message ?? fallback), error ?? {});
}

export function useReportPosting(jobId: string) {
  return useMutation({
    mutationFn: async (input: ReportInput): Promise<ReportReceipt> => {
      const { receipt, error } = await reportPosting(jobId, input);
      if (error || !receipt) fail(error, "Your report could not be sent.");
      return receipt;
    },
  });
}

export function useReportApplicant(applicationId: string) {
  return useMutation({
    mutationFn: async (input: ReportInput): Promise<ReportReceipt> => {
      const { receipt, error } = await reportApplicant(applicationId, input);
      if (error || !receipt) fail(error, "Your report could not be sent.");
      return receipt;
    },
  });
}
