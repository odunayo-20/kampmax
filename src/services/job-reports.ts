// ============================================================
// REPORTING A POSTING OR AN APPLICANT
// ============================================================
//
//    POST /jobs/:id/report          → report a posting (anyone but its owner)
//    POST /applications/:id/report  → report an applicant (the employer who got it)
//
// A person can have one open report per target, so reporting again is refused
// with a message saying it is already being looked at.

import { apiClient } from "@/lib/api-client";
import type { ApiError } from "@/lib/api-client";
import type { ReportInput } from "@/types/job-moderation";

export interface ReportReceipt {
  id: string;
  targetType: "POSTING" | "APPLICANT";
  status: "OPEN" | "RESOLVED";
  createdAt: string;
}

function clean(input: ReportInput): ReportInput {
  const details = input.details?.trim();
  return { reason: input.reason, ...(details ? { details } : {}) };
}

/** Endpoint: POST /jobs/:id/report */
export async function reportPosting(
  jobId: string,
  input: ReportInput
): Promise<{ receipt: ReportReceipt | null; error: ApiError | null }> {
  const { data, error } = await apiClient.post<ReportInput, ReportReceipt>(
    `/jobs/${jobId}/report`,
    clean(input)
  );
  return error ? { receipt: null, error } : { receipt: data, error: null };
}

/** Endpoint: POST /applications/:id/report */
export async function reportApplicant(
  applicationId: string,
  input: ReportInput
): Promise<{ receipt: ReportReceipt | null; error: ApiError | null }> {
  const { data, error } = await apiClient.post<ReportInput, ReportReceipt>(
    `/applications/${applicationId}/report`,
    clean(input)
  );
  return error ? { receipt: null, error } : { receipt: data, error: null };
}
