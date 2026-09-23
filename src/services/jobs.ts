// ============================================================
// JOBS, PROPOSALS & ENGAGEMENTS SERVICE
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
//
//  PROPOSALS
//    POST   /proposals               → submit a proposal
//    GET    /proposals/me            → list current freelancer's proposals
//    GET    /proposals/jobs/:jobId   → list proposals for a job (employer)
//    GET    /proposals/:id           → get a proposal
//    PATCH  /proposals/:id           → update an editable proposal
//    POST   /proposals/:id/withdraw  → withdraw a proposal (freelancer)
//    POST   /proposals/:id/shortlist → shortlist a proposal (employer)
//    POST   /proposals/:id/reject    → reject a proposal (employer)
//    POST   /proposals/:id/accept    → accept a proposal (employer)
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

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
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

export type JobStatus = "draft" | "published" | "paused" | "closed" | "cancelled" | "expired";

export interface Job {
  id: string;
  employerId: string;
  employer: JobEmployerSummary;
  title: string;
  slug: string;
  description: string | null;
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
  proposalCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateJobDto {
  title: string;
  description?: string;
  categoryId?: string;
  campusId?: string;
  budgetType: "fixed" | "hourly" | "negotiable";
  budgetMin?: number;
  budgetMax?: number;
  currency?: string;
  experienceLevel?: string;
  estimatedDuration?: string;
  locationType?: string;
  country?: string;
  state?: string;
  city?: string;
  applicationDeadline?: string;
  skillIds?: string[];
}

export interface UpdateJobDto extends Partial<CreateJobDto> {}

export interface JobBrowseQuery {
  page?: number;
  limit?: number;
  q?: string;
  categoryId?: string;
  campusId?: string;
  budgetType?: string;
  experienceLevel?: string;
  locationType?: string;
  minBudget?: number;
  maxBudget?: number;
  sort?: string;
}

// ═══════════════════════════════════════════════════════════
// PROPOSALS — response shapes & DTOs
// ═══════════════════════════════════════════════════════════

export interface ProposalJobSummary {
  id: string;
  title: string;
  slug: string;
}

export interface ProposalFreelancerSummary {
  id: string;
  userId: string;
  username: string;
  fullName: string;
  avatar: string | null;
}

export type ProposalStatus =
  | "draft"
  | "submitted"
  | "under_review"
  | "shortlisted"
  | "accepted"
  | "rejected"
  | "withdrawn";

export interface Proposal {
  id: string;
  jobId: string;
  job: ProposalJobSummary;
  freelancerId: string;
  freelancer: ProposalFreelancerSummary;
  coverLetter: string;
  /**
   * DISPLAY ONLY — backend recalculates and confirms the agreed amount at
   * acceptance. Do NOT treat this as the authoritative payment figure.
   */
  proposedAmount: number;
  currency: string;
  estimatedDeliveryDays: number | null;
  status: ProposalStatus;
  submittedAt: string | null;
  withdrawnAt: string | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SubmitProposalDto {
  jobId: string;
  coverLetter: string;
  proposedAmount: number;
  currency?: string;
  estimatedDeliveryDays?: number;
}

export interface UpdateProposalDto {
  coverLetter?: string;
  proposedAmount?: number;
  estimatedDeliveryDays?: number;
}

export interface AcceptProposalResult {
  proposal: Proposal;
  engagementId: string;
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

export type EngagementStatus =
  | "pending_funding"
  | "funded"
  | "in_progress"
  | "work_submitted"
  | "completed"
  | "cancelled";

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
  if (query.page) params.set("page", String(query.page));
  if (query.limit) params.set("limit", String(query.limit));
  if (query.q) params.set("q", query.q);
  if (query.categoryId) params.set("categoryId", query.categoryId);
  if (query.campusId) params.set("campusId", query.campusId);
  if (query.budgetType) params.set("budgetType", query.budgetType);
  if (query.experienceLevel) params.set("experienceLevel", query.experienceLevel);
  if (query.locationType) params.set("locationType", query.locationType);
  if (query.minBudget !== undefined) params.set("minBudget", String(query.minBudget));
  if (query.maxBudget !== undefined) params.set("maxBudget", String(query.maxBudget));
  if (query.sort) params.set("sort", query.sort);

  const qs = params.toString();
  const { data, error } = await apiClient.get<PaginatedResult<Job>>(
    `/jobs${qs ? `?${qs}` : ""}`
  );
  if (error) return { jobs: [], total: 0, page: 1, totalPages: 1, error };

  return {
    jobs: data.data ?? [],
    total: data.total ?? 0,
    page: data.page ?? 1,
    totalPages: data.totalPages ?? 1,
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
export async function listMyJobs(query: { page?: number; limit?: number } = {}): Promise<{
  jobs: Job[];
  total: number;
  page: number;
  totalPages: number;
  error: ApiError | null;
}> {
  const params = new URLSearchParams();
  if (query.page) params.set("page", String(query.page));
  if (query.limit) params.set("limit", String(query.limit));
  const qs = params.toString();

  const { data, error } = await apiClient.get<PaginatedResult<Job>>(
    `/jobs/me${qs ? `?${qs}` : ""}`
  );
  if (error) return { jobs: [], total: 0, page: 1, totalPages: 1, error };

  return {
    jobs: data.data ?? [],
    total: data.total ?? 0,
    page: data.page ?? 1,
    totalPages: data.totalPages ?? 1,
    error: null,
  };
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
// PROPOSAL API FUNCTIONS
// ═══════════════════════════════════════════════════════════

/**
 * Submit a proposal for a job (authenticated freelancer).
 * Endpoint: POST /proposals
 */
export async function submitProposal(dto: SubmitProposalDto): Promise<{
  proposal: Proposal | null;
  error: ApiError | null;
}> {
  const { data, error } = await apiClient.post<SubmitProposalDto, Proposal>("/proposals", dto);
  if (error) return { proposal: null, error };
  return { proposal: data, error: null };
}

/**
 * List proposals submitted by the current freelancer.
 * Endpoint: GET /proposals/me
 */
export async function listMyProposals(query: {
  page?: number;
  limit?: number;
  status?: ProposalStatus;
} = {}): Promise<{
  proposals: Proposal[];
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

  const { data, error } = await apiClient.get<PaginatedResult<Proposal>>(
    `/proposals/me${qs ? `?${qs}` : ""}`
  );
  if (error) return { proposals: [], total: 0, page: 1, totalPages: 1, error };

  return {
    proposals: data.data ?? [],
    total: data.total ?? 0,
    page: data.page ?? 1,
    totalPages: data.totalPages ?? 1,
    error: null,
  };
}

/**
 * List proposals received for a job (job owner / employer).
 * Endpoint: GET /proposals/jobs/:jobId
 */
export async function listProposalsForJob(
  jobId: string,
  query: { page?: number; limit?: number; status?: ProposalStatus } = {}
): Promise<{
  proposals: Proposal[];
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

  const { data, error } = await apiClient.get<PaginatedResult<Proposal>>(
    `/proposals/jobs/${jobId}${qs ? `?${qs}` : ""}`
  );
  if (error) return { proposals: [], total: 0, page: 1, totalPages: 1, error };

  return {
    proposals: data.data ?? [],
    total: data.total ?? 0,
    page: data.page ?? 1,
    totalPages: data.totalPages ?? 1,
    error: null,
  };
}

/**
 * Get a single proposal (freelancer owner or job owner).
 * Endpoint: GET /proposals/:id
 */
export async function getProposalById(id: string): Promise<{
  proposal: Proposal | null;
  error: ApiError | null;
}> {
  const { data, error } = await apiClient.get<Proposal>(`/proposals/${id}`);
  if (error) return { proposal: null, error };
  return { proposal: data, error: null };
}

/**
 * Update an editable proposal (freelancer only, while in draft/submitted).
 * Endpoint: PATCH /proposals/:id
 */
export async function updateProposal(
  id: string,
  dto: UpdateProposalDto
): Promise<{ proposal: Proposal | null; error: ApiError | null }> {
  const { data, error } = await apiClient.patch<UpdateProposalDto, Proposal>(
    `/proposals/${id}`,
    dto
  );
  if (error) return { proposal: null, error };
  return { proposal: data, error: null };
}

/**
 * Withdraw a proposal (freelancer only).
 * Endpoint: POST /proposals/:id/withdraw
 */
export async function withdrawProposal(id: string): Promise<{
  proposal: Proposal | null;
  error: ApiError | null;
}> {
  const { data, error } = await apiClient.post<undefined, Proposal>(
    `/proposals/${id}/withdraw`
  );
  if (error) return { proposal: null, error };
  return { proposal: data, error: null };
}

/**
 * Shortlist a proposal (job owner / employer only).
 * Endpoint: POST /proposals/:id/shortlist
 */
export async function shortlistProposal(id: string): Promise<{
  proposal: Proposal | null;
  error: ApiError | null;
}> {
  const { data, error } = await apiClient.post<undefined, Proposal>(
    `/proposals/${id}/shortlist`
  );
  if (error) return { proposal: null, error };
  return { proposal: data, error: null };
}

/**
 * Reject a proposal (job owner / employer only).
 * Endpoint: POST /proposals/:id/reject
 */
export async function rejectProposal(id: string, reason?: string): Promise<{
  proposal: Proposal | null;
  error: ApiError | null;
}> {
  const { data, error } = await apiClient.post<{ reason?: string }, Proposal>(
    `/proposals/${id}/reject`,
    { reason }
  );
  if (error) return { proposal: null, error };
  return { proposal: data, error: null };
}

/**
 * Accept a proposal (job owner / employer only).
 * Creates an engagement record on the backend.
 * Endpoint: POST /proposals/:id/accept
 */
export async function acceptProposal(id: string): Promise<{
  result: AcceptProposalResult | null;
  error: ApiError | null;
}> {
  const { data, error } = await apiClient.post<undefined, AcceptProposalResult>(
    `/proposals/${id}/accept`
  );
  if (error) return { result: null, error };
  return { result: data, error: null };
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
    engagements: data.data ?? [],
    total: data.total ?? 0,
    page: data.page ?? 1,
    totalPages: data.totalPages ?? 1,
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
    engagements: data.data ?? [],
    total: data.total ?? 0,
    page: data.page ?? 1,
    totalPages: data.totalPages ?? 1,
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
