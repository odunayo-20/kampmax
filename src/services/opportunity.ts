import type { ApiError } from "@/lib/api-client";
import {
  cancelJob,
  closeJob,
  createJob,
  getJobById,
  getMyJobById,
  listMyJobs,
  listPublicJobs,
  pauseJob,
  publishJob,
  updateJob,
  type Job,
} from "@/services/jobs";
import {
  isBackendId,
  jobListFiltersToQuery,
  jobToOpportunity,
  opportunityInputToJobDto,
  opportunityInputToUpdateDto,
  opportunityStatusToBackend,
} from "@/lib/job-api-mapping";
import { getCampusById } from "@/services/campus";
import type {
  Opportunity,
  OpportunityInput,
  OpportunityPage,
  OpportunityQuery,
  OpportunityStatus,
} from "@/types/opportunity";

// Jobs, straight from the backend (NestJS /jobs). services/jobs.ts is the typed
// client and lib/job-api-mapping.ts translates to the Opportunity vocabulary.

/** Category label for a job; the name arrives with the job from the API. */
export function categoryLabelFor(job: { categoryName?: string }): string {
  return job.categoryName ?? "Other";
}

export function campusNameFor(campusId?: string): string | undefined {
  if (!campusId) return undefined;
  return getCampusById(campusId)?.name;
}

function emptyJobPage(size: number): OpportunityPage {
  return { items: [], total: 0, page: 1, size, totalPages: 1 };
}

export { isBackendId };

/**
 * Browse published jobs with search and filters.
 * Endpoint: GET /api/v1/jobs
 */
export async function getOpportunitiesPageApi(
  query: OpportunityQuery = {}
): Promise<{ page: OpportunityPage; error: ApiError | null }> {
  const size = query.size ?? 9;
  const { jobs, total, page, totalPages, error } = await listPublicJobs(
    jobListFiltersToQuery({
      search: query.search,
      categoryId: query.categoryId,
      campusId: query.campusId,
      experience: query.experience,
      arrangement: query.arrangement,
      sort: query.sort,
      page: query.page,
      size,
    })
  );
  if (error) return { page: emptyJobPage(size), error };
  return {
    page: { items: jobs.map(jobToOpportunity), total, page, size, totalPages },
    error: null,
  };
}

type JobResult = { job: Opportunity | null; error: ApiError | null };

function toJobResult({ job, error }: { job: Job | null; error: ApiError | null }): JobResult {
  return job ? { job: jobToOpportunity(job), error: null } : { job: null, error };
}

/**
 * A published job by id (public).
 * Endpoint: GET /api/v1/jobs/:id
 */
export async function getJobByIdApi(id: string): Promise<JobResult> {
  return toJobResult(await getJobById(id));
}

/**
 * One of the employer's own jobs, in any status.
 * Endpoint: GET /api/v1/jobs/me/:id
 */
export async function getMyJobByIdApi(id: string): Promise<JobResult> {
  return toJobResult(await getMyJobById(id));
}

/**
 * The employer's own jobs, optionally limited to one UI status tab.
 * Endpoint: GET /api/v1/jobs/me
 */
export async function getMyJobsApi(
  page = 1,
  size = 20,
  status?: OpportunityStatus | "all"
): Promise<{ page: OpportunityPage; error: ApiError | null }> {
  const res = await listMyJobs({
    page,
    limit: size,
    statuses: opportunityStatusToBackend(status),
  });
  if (res.error) return { page: emptyJobPage(size), error: res.error };
  return {
    page: {
      items: res.jobs.map(jobToOpportunity),
      total: res.total,
      page: res.page,
      size,
      totalPages: res.totalPages,
    },
    error: null,
  };
}

/** Per-status counts of the employer's jobs (for the filter tabs). */
export async function getMyJobCountsApi(): Promise<{
  counts: Record<OpportunityStatus, number> & { all: number };
  error: ApiError | null;
}> {
  const counts = {
    draft: 0,
    pending_review: 0,
    open: 0,
    closed: 0,
    expired: 0,
    cancelled: 0,
    all: 0,
  };
  const res = await listMyJobs({ page: 1, limit: 100 });
  if (res.error) return { counts, error: res.error };
  for (const job of res.jobs.map(jobToOpportunity)) counts[job.status] += 1;
  counts.all = res.total;
  return { counts, error: null };
}

/**
 * Create a job as a draft. `mediaIds` are attachments already uploaded.
 * Endpoint: POST /api/v1/jobs
 */
export async function createJobApi(
  input: OpportunityInput,
  mediaIds?: string[]
): Promise<JobResult> {
  return toJobResult(await createJob(opportunityInputToJobDto(input, mediaIds)));
}

/**
 * Update a draft job.
 * Endpoint: PATCH /api/v1/jobs/:id
 */
export async function updateJobApi(
  id: string,
  input: OpportunityInput,
  mediaIds?: string[]
): Promise<JobResult> {
  return toJobResult(await updateJob(id, opportunityInputToUpdateDto(input, mediaIds)));
}

/** Endpoint: POST /api/v1/jobs/:id/publish */
export async function publishJobApi(id: string): Promise<JobResult> {
  return toJobResult(await publishJob(id));
}

/** Endpoint: POST /api/v1/jobs/:id/pause */
export async function pauseJobApi(id: string): Promise<JobResult> {
  return toJobResult(await pauseJob(id));
}

/** Endpoint: POST /api/v1/jobs/:id/close */
export async function closeJobApi(id: string): Promise<JobResult> {
  return toJobResult(await closeJob(id));
}

/** Endpoint: POST /api/v1/jobs/:id/cancel */
export async function cancelJobApi(id: string): Promise<JobResult> {
  return toJobResult(await cancelJob(id));
}
