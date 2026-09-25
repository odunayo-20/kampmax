// ============================================================
// JOBS & ENGAGEMENTS SERVICE
// ============================================================
//
// Async wrappers over the NestJS backend for the freelancer
// work-marketplace modules. Maps 1:1 to the backend controllers:
//
//  JOBS
//    POST   /jobs                    → create a draft job
//    GET    /jobs                    → list published jobs (public)
//    GET    /jobs/me                 → list current user's jobs
//    GET    /jobs/:id                → get published job by id (public)
//    GET    /jobs/slug/:slug         → get published job by slug (public)
//    PATCH  /jobs/:id                → update a draft job (owner)
//    POST   /jobs/:id/publish        → publish a draft job (owner)
//    POST   /jobs/:id/pause          → pause a published job (owner)
//    POST   /jobs/:id/close          → close a job (owner)
//    POST   /jobs/:id/cancel         → cancel a job (owner)
//    GET    /jobs/me/:id             → one of my jobs, any status (owner)
//    GET    /jobs/saved[/ids]        → my saved jobs
//    POST   /jobs/:id/save           → save a job
//    DELETE /jobs/:id/save           → unsave a job
//
//  Proposals live in services/proposals.ts.
//
//  ENGAGEMENTS
//    POST   /engagements/accept          → accept proposal + create engagement
//    GET    /engagements/me              → list engagements (freelancer)
//    GET    /engagements/employer/me     → list engagements (employer)
//    GET    /engagements/:id             → get an engagement (either party)
//    POST   /engagements/:id/fund        → fund (employer)
//    POST   /engagements/:id/start       → start work (employer)
//    POST   /engagements/:id/submit-work → submit work (freelancer)
//    POST   /engagements/:id/complete    → mark complete (employer)
//    POST   /engagements/:id/cancel      → cancel (either party)
//
// SECURITY:
//   - Job ownership, proposal authorship, and engagement party membership
//     are all resolved server-side from the JWT. The frontend never
//     passes a userId, freelancerId, or employerId in the request body.
//   - Budget display amounts are for UI only; the backend recalculates
//     and confirms all financial figures at acceptance.
//   - Status transitions are backend-owned via the state machine.

import { apiClient } from "@/lib/api-client";
import type { ApiError } from "@/lib/api-client";

// ── Shared paginated result ──────────────────────────────────

/** Backend list envelope (already unwrapped from { success, data }). */
export interface PaginatedResult<T> {
  items: T[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

// ═══════════════════════════════════════════════════════════
// JOBS — response shapes & DTOs
// ═══════════════════════════════════════════════════════════

export interface JobSkillSummary {
  skillId: string;
  name: string;
  slug: string;
}

export interface JobCategorySummary {
  id: string;
  name: string;
}

export interface JobCampusSummary {
  id: string;
  name: string;
}

export interface JobEmployerSummary {
  id: string;
  userId: string;
  displayName: string;
}

/** Backend JobStatus enum (uppercase, as returned by the API). */
export type JobStatus = "DRAFT" | "PUBLISHED" | "PAUSED" | "CLOSED" | "CANCELLED" | "EXPIRED";

export interface JobScreeningQuestion {
  id: string;
  question: string;
  optional: boolean;
}

export interface JobAttachment {
  id: string;
  filename: string;
  sizeBytes: number;
  mimeType: string;
  url: string | null;
}

export interface Job {
  id: string;
  employerId: string;
  employer: JobEmployerSummary;
  title: string;
  slug: string;
  description: string | null;
  summary: string | null;
  requirements: string | null;
  categoryKey: string | null;
  category: JobCategorySummary | null;
  campus: JobCampusSummary | null;
  budgetType: string;
  budgetMin: number | null;
  budgetMax: number | null;
  currency: string;
  experienceLevel: string | null;
  estimatedDuration: string | null;
  locationType: string;
  country: string | null;
  state: string | null;
  city: string | null;
  applicationDeadline: string | null;
  status: JobStatus;
  visibility: string;
  publishedAt: string | null;
  skills: JobSkillSummary[];
  screeningQuestions: JobScreeningQuestion[];
  attachments: JobAttachment[];
  proposalCount: number;
  createdAt: string;
  updatedAt: string;
}

/** Exact body accepted by POST /jobs (the backend rejects unknown fields). */
export interface CreateJobDto {
  title: string;
  description?: string;
  summary?: string;
  requirements?: string;
  /** JOB-taxonomy category id (GET /categories?type=JOB). */
  categoryId?: string;
  campusId?: string;
  budgetType?: "FIXED" | "HOURLY";
  budgetMin?: number;
  budgetMax?: number;
  currency?: string;
  experienceLevel?: "JUNIOR" | "MIDLEVEL" | "SENIOR" | "EXPERT";
  estimatedDuration?: string;
  locationType?: "REMOTE" | "ONSITE" | "HYBRID";
  country?: string;
  state?: string;
  city?: string;
  applicationDeadline?: string;
  /** Skill names; the backend resolves (or creates) them. */
  skills?: string[];
  screeningQuestions?: { id?: string; question: string; optional?: boolean }[];
  /** Uploaded media ids to attach. */
  mediaIds?: string[];
}

/** PATCH /jobs/:id — drafts only; null clears a clearable field. */
export interface UpdateJobDto {
  title?: string;
  description?: string | null;
  summary?: string | null;
  requirements?: string | null;
  categoryId?: string | null;
  campusId?: string | null;
  budgetType?: "FIXED" | "HOURLY";
  budgetMin?: number | null;
  budgetMax?: number | null;
  currency?: string;
  experienceLevel?: "JUNIOR" | "MIDLEVEL" | "SENIOR" | "EXPERT" | null;
  estimatedDuration?: string | null;
  locationType?: "REMOTE" | "ONSITE" | "HYBRID";
  country?: string | null;
  state?: string | null;
  city?: string | null;
  applicationDeadline?: string | null;
  skills?: string[];
  screeningQuestions?: { id?: string; question: string; optional?: boolean }[];
  mediaIds?: string[];
}

/** Query params GET /jobs accepts (anything else is a 400). */
export interface JobBrowseQuery {
  page?: number;
  limit?: number;
  search?: string;
  categoryId?: string;
  campusId?: string;
  budgetType?: string;
  experienceLevel?: string;
  locationType?: string;
  /** newest | oldest | deadline */
  sort?: string;
}

// ═══════════════════════════════════════════════════════════
// ENGAGEMENTS — response shapes
// ═══════════════════════════════════════════════════════════

export interface EngagementJobSummary {
  id: string;
  title: string;
  slug: string;
}

export interface EngagementPartySummary {
  id: string;
  userId: string;
  username: string;
  fullName: string;
  avatar: string | null;
}

/** Backend EngagementStatus enum, exactly as the API returns it. */
export type EngagementStatus =
  | "PENDING_PAYMENT"
  | "FUNDED"
  | "IN_PROGRESS"
  | "SUBMITTED"
  | "COMPLETED"
  | "DISPUTED"
  | "CANCELLED";

export interface Engagement {
  id: string;
  proposalId: string;
  jobId: string;
  job: EngagementJobSummary;
  freelancerId: string;
  freelancer: EngagementPartySummary;
  employerId: string;
  employer: EngagementPartySummary;
  /**
   * DISPLAY ONLY — this is the agreed-upon amount captured at acceptance.
   * The backend handles all financial settlement; the frontend never
   * computes or confirms payment totals.
   */
  agreedAmount: number;
  currency: string;
  status: EngagementStatus;
  startDate: string | null;
  expectedCompletionDate: string | null;
  submittedAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  createdAt: string;
  updatedAt: string;
}

// ═══════════════════════════════════════════════════════════
// JOB API FUNCTIONS
// ═══════════════════════════════════════════════════════════

/**
 * Browse published jobs (public, no auth required).
 * Endpoint: GET /jobs
 */
export async function listPublicJobs(query: JobBrowseQuery = {}): Promise<{
  jobs: Job[];
  total: number;
  page: number;
  totalPages: number;
  error: ApiError | null;
}> {
  const params = new URLSearchParams();
  if (query.search) params.set("search", query.search);
  if (query.categoryId) params.set("categoryId", query.categoryId);
  if (query.campusId) params.set("campusId", query.campusId);
  if (query.budgetType) params.set("budgetType", query.budgetType);
  if (query.experienceLevel) params.set("experienceLevel", query.experienceLevel);
  if (query.locationType) params.set("locationType", query.locationType);
  if (query.sort) params.set("sort", query.sort);
  if (query.page) params.set("page", String(query.page));
  if (query.limit) params.set("limit", String(query.limit));

  const qs = params.toString();
  const { data, error } = await apiClient.get<PaginatedResult<Job>>(
    `/jobs${qs ? `?${qs}` : ""}`
  );
  if (error) return { jobs: [], total: 0, page: 1, totalPages: 1, error };
  return fromPage(data);
}

function fromPage<T>(data: PaginatedResult<T> | null | undefined): {
  jobs: T[];
  total: number;
  page: number;
  totalPages: number;
  error: null;
} {
  return {
    jobs: data?.items ?? [],
    total: data?.meta?.total ?? 0,
    page: data?.meta?.page ?? 1,
    totalPages: data?.meta?.totalPages ?? 1,
    error: null,
  };
}

/**
 * Get a published job by ID (public).
 * Endpoint: GET /jobs/:id
 */
export async function getJobById(id: string): Promise<{
  job: Job | null;
  error: ApiError | null;
}> {
  const { data, error } = await apiClient.get<Job>(`/jobs/${id}`);
  if (error) return { job: null, error };
  return { job: data, error: null };
}

/**
 * Get a published job by slug (public).
 * Endpoint: GET /jobs/slug/:slug
 */
export async function getJobBySlug(slug: string): Promise<{
  job: Job | null;
  error: ApiError | null;
}> {
  const { data, error } = await apiClient.get<Job>(`/jobs/slug/${slug}`);
  if (error) return { job: null, error };
  return { job: data, error: null };
}

/**
 * List jobs created by the current (authenticated) user.
 * Endpoint: GET /jobs/me
 */
export async function listMyJobs(
  query: { page?: number; limit?: number; statuses?: JobStatus[] } = {}
): Promise<{
  jobs: Job[];
  total: number;
  page: number;
  totalPages: number;
  error: ApiError | null;
}> {
  const params = new URLSearchParams();
  if (query.page) params.set("page", String(query.page));
  if (query.limit) params.set("limit", String(query.limit));
  if (query.statuses?.length) params.set("status", query.statuses.join(","));
  const qs = params.toString();

  const { data, error } = await apiClient.get<PaginatedResult<Job>>(
    `/jobs/me${qs ? `?${qs}` : ""}`
  );
  if (error) return { jobs: [], total: 0, page: 1, totalPages: 1, error };
  return fromPage(data);
}

/**
 * One of my own jobs in any status (drafts/closed jobs aren't public).
 * Endpoint: GET /jobs/me/:id
 */
export async function getMyJobById(id: string): Promise<{
  job: Job | null;
  error: ApiError | null;
}> {
  const { data, error } = await apiClient.get<Job>(`/jobs/me/${id}`);
  if (error) return { job: null, error };
  return { job: data, error: null };
}

// ── Saved jobs ──────────────────────────────────────────────

/** Endpoint: POST /jobs/:id/save */
export async function saveJob(id: string): Promise<{ error: ApiError | null }> {
  const { error } = await apiClient.post<undefined, { saved: true }>(`/jobs/${id}/save`);
  return { error };
}

/** Endpoint: DELETE /jobs/:id/save */
export async function unsaveJob(id: string): Promise<{ error: ApiError | null }> {
  const { error } = await apiClient.delete<{ saved: false }>(`/jobs/${id}/save`);
  return { error };
}

/** Ids of every job the current user has saved. Endpoint: GET /jobs/saved/ids */
export async function listSavedJobIds(): Promise<{ ids: string[]; error: ApiError | null }> {
  const { data, error } = await apiClient.get<string[]>("/jobs/saved/ids");
  if (error) return { ids: [], error };
  return { ids: data ?? [], error: null };
}

/** Saved jobs, newest bookmark first (closed jobs included). Endpoint: GET /jobs/saved */
export async function listSavedJobs(
  query: { page?: number; limit?: number } = {}
): Promise<{ jobs: Job[]; total: number; page: number; totalPages: number; error: ApiError | null }> {
  const params = new URLSearchParams();
  if (query.page) params.set("page", String(query.page));
  if (query.limit) params.set("limit", String(query.limit));
  const qs = params.toString();

  const { data, error } = await apiClient.get<PaginatedResult<Job>>(
    `/jobs/saved${qs ? `?${qs}` : ""}`
  );
  if (error) return { jobs: [], total: 0, page: 1, totalPages: 1, error };
  return fromPage(data);
}

/**
 * Create a new job (saved as draft until published).
 * Endpoint: POST /jobs
 */
export async function createJob(dto: CreateJobDto): Promise<{
  job: Job | null;
  error: ApiError | null;
}> {
  const { data, error } = await apiClient.post<CreateJobDto, Job>("/jobs", dto);
  if (error) return { job: null, error };
  return { job: data, error: null };
}

/**
 * Update a draft job (owner only).
 * Endpoint: PATCH /jobs/:id
 */
export async function updateJob(id: string, dto: UpdateJobDto): Promise<{
  job: Job | null;
  error: ApiError | null;
}> {
  const { data, error } = await apiClient.patch<UpdateJobDto, Job>(`/jobs/${id}`, dto);
  if (error) return { job: null, error };
  return { job: data, error: null };
}

/**
 * Publish a draft job (owner only).
 * Endpoint: POST /jobs/:id/publish
 */
export async function publishJob(id: string): Promise<{
  job: Job | null;
  error: ApiError | null;
}> {
  const { data, error } = await apiClient.post<undefined, Job>(`/jobs/${id}/publish`);
  if (error) return { job: null, error };
  return { job: data, error: null };
}

/**
 * Pause a published job (owner only).
 * Endpoint: POST /jobs/:id/pause
 */
export async function pauseJob(id: string): Promise<{
  job: Job | null;
  error: ApiError | null;
}> {
  const { data, error } = await apiClient.post<undefined, Job>(`/jobs/${id}/pause`);
  if (error) return { job: null, error };
  return { job: data, error: null };
}

/**
 * Close a job (owner only).
 * Endpoint: POST /jobs/:id/close
 */
export async function closeJob(id: string): Promise<{
  job: Job | null;
  error: ApiError | null;
}> {
  const { data, error } = await apiClient.post<undefined, Job>(`/jobs/${id}/close`);
  if (error) return { job: null, error };
  return { job: data, error: null };
}

/**
 * Cancel a job (owner only).
 * Endpoint: POST /jobs/:id/cancel
 */
export async function cancelJob(id: string): Promise<{
  job: Job | null;
  error: ApiError | null;
}> {
  const { data, error } = await apiClient.post<undefined, Job>(`/jobs/${id}/cancel`);
  if (error) return { job: null, error };
  return { job: data, error: null };
}

// ═══════════════════════════════════════════════════════════
// ENGAGEMENT API FUNCTIONS
// ═══════════════════════════════════════════════════════════

/**
 * List engagements for the current freelancer.
 * Endpoint: GET /engagements/me
 */
export async function listMyEngagements(query: {
  page?: number;
  limit?: number;
  status?: EngagementStatus;
} = {}): Promise<{
  engagements: Engagement[];
  total: number;
  page: number;
  totalPages: number;
  error: ApiError | null;
}> {
  const params = new URLSearchParams();
  if (query.page) params.set("page", String(query.page));
  if (query.limit) params.set("limit", String(query.limit));
  if (query.status) params.set("status", query.status);
  const qs = params.toString();

  const { data, error } = await apiClient.get<PaginatedResult<Engagement>>(
    `/engagements/me${qs ? `?${qs}` : ""}`
  );
  if (error) return { engagements: [], total: 0, page: 1, totalPages: 1, error };

  return {
    engagements: data.items ?? [],
    total: data.meta?.total ?? 0,
    page: data.meta?.page ?? 1,
    totalPages: data.meta?.totalPages ?? 1,
    error: null,
  };
}

/**
 * List engagements for the current employer.
 * Endpoint: GET /engagements/employer/me
 */
export async function listMyEmployerEngagements(query: {
  page?: number;
  limit?: number;
  status?: EngagementStatus;
} = {}): Promise<{
  engagements: Engagement[];
  total: number;
  page: number;
  totalPages: number;
  error: ApiError | null;
}> {
  const params = new URLSearchParams();
  if (query.page) params.set("page", String(query.page));
  if (query.limit) params.set("limit", String(query.limit));
  if (query.status) params.set("status", query.status);
  const qs = params.toString();

  const { data, error } = await apiClient.get<PaginatedResult<Engagement>>(
    `/engagements/employer/me${qs ? `?${qs}` : ""}`
  );
  if (error) return { engagements: [], total: 0, page: 1, totalPages: 1, error };

  return {
    engagements: data.items ?? [],
    total: data.meta?.total ?? 0,
    page: data.meta?.page ?? 1,
    totalPages: data.meta?.totalPages ?? 1,
    error: null,
  };
}

/**
 * Get a single engagement (accessible by either party).
 * Endpoint: GET /engagements/:id
 */
export async function getEngagementById(id: string): Promise<{
  engagement: Engagement | null;
  error: ApiError | null;
}> {
  const { data, error } = await apiClient.get<Engagement>(`/engagements/${id}`);
  if (error) return { engagement: null, error };
  return { engagement: data, error: null };
}

/**
 * Fund an engagement (employer/job-owner action).
 * Endpoint: POST /engagements/:id/fund
 */
export async function fundEngagement(id: string): Promise<{
  engagement: Engagement | null;
  error: ApiError | null;
}> {
  const { data, error } = await apiClient.post<undefined, Engagement>(
    `/engagements/${id}/fund`
  );
  if (error) return { engagement: null, error };
  return { engagement: data, error: null };
}

/**
 * Start work on an engagement (employer).
 * Endpoint: POST /engagements/:id/start
 */
export async function startEngagement(id: string): Promise<{
  engagement: Engagement | null;
  error: ApiError | null;
}> {
  const { data, error } = await apiClient.post<undefined, Engagement>(
    `/engagements/${id}/start`
  );
  if (error) return { engagement: null, error };
  return { engagement: data, error: null };
}

/**
 * Submit work for review (freelancer).
 * Endpoint: POST /engagements/:id/submit-work
 */
export async function submitEngagementWork(id: string): Promise<{
  engagement: Engagement | null;
  error: ApiError | null;
}> {
  const { data, error } = await apiClient.post<undefined, Engagement>(
    `/engagements/${id}/submit-work`
  );
  if (error) return { engagement: null, error };
  return { engagement: data, error: null };
}

/**
 * Mark an engagement complete (employer).
 * Endpoint: POST /engagements/:id/complete
 */
export async function completeEngagement(id: string): Promise<{
  engagement: Engagement | null;
  error: ApiError | null;
}> {
  const { data, error } = await apiClient.post<undefined, Engagement>(
    `/engagements/${id}/complete`
  );
  if (error) return { engagement: null, error };
  return { engagement: data, error: null };
}

/**
 * Cancel an engagement (either party).
 * Endpoint: POST /engagements/:id/cancel
 */
export async function cancelEngagement(
  id: string,
  reason?: string
): Promise<{ engagement: Engagement | null; error: ApiError | null }> {
  const { data, error } = await apiClient.post<{ reason?: string }, Engagement>(
    `/engagements/${id}/cancel`,
    { reason }
  );
  if (error) return { engagement: null, error };
  return { engagement: data, error: null };
}
