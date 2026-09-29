// ============================================================
// PROPOSALS SERVICE  (Module 23C — Proposal Lifecycle)
// ============================================================
//
// Dedicated facade over the NestJS /proposals endpoints.
//
// SECURITY:
//   - Proposal ownership (freelancerId) is ALWAYS resolved server-side
//     from the JWT. The client never passes a freelancerId directly.
//   - Employer actions (shortlist, reject, accept) are guarded server-side
//     by employer ownership of the job. The client only passes proposalId.
//   - Status transitions are backend-authoritative. The frontend only
//     displays returned state — it never sets status locally.
//
// API ENDPOINTS (NestJS /proposals):
//   POST   /proposals                     → submit a proposal
//   GET    /proposals/me                  → freelancer's own proposals
//   GET    /proposals/jobs/:jobId         → proposals on employer's job
//   GET    /proposals/:proposalId         → single proposal (party access)
//   PATCH  /proposals/:proposalId         → update draft proposal
//   POST   /proposals/:proposalId/withdraw
//   POST   /proposals/:proposalId/shortlist
//   POST   /proposals/:proposalId/reject
//   POST   /proposals/:proposalId/accept  → also creates engagement

import { apiClient } from "@/lib/api-client";
import type { ApiError } from "@/lib/api-client";
import { getCurrentUser } from "@/services/users";
import { getCurrentAuthUser } from "@/lib/current-user-store";
import { getMyFreelancerProfile } from "@/services/freelancer";
import { getProposalsByFreelancer } from "@/data/opportunity";
import type {
  EmployerApplicationStatus,
  EmployerApplicationsPage,
  EmployerApplicationSummary,
  JobEligibility,
  Opportunity,
  OpportunityStatus,
  Proposal,
  ProposalInput,
  ProposalStatus,
} from "@/types/opportunity";
import { ELIGIBILITY_CODE, OPPORTUNITY_STATUS, PROPOSAL_STATUS } from "@/types/opportunity";

// ── Shared types ─────────────────────────────────────────────

/** Backend proposal payload (modules/proposals ProposalResponse). */
export interface ProposalResponse {
  id: string;
  jobId: string;
  job?: { id: string; title: string; slug: string; status?: string };
  freelancerId: string;
  freelancer?: {
    id: string;
    userId: string;
    username: string;
    fullName: string;
    avatar: string | null;
    headline: string | null;
  };
  coverLetter: string;
  proposedAmount: number | string;
  currency: string;
  estimatedDeliveryDays: number | null;
  screeningAnswers?: { questionId: string; answer: string }[];
  attachments?: { id: string; filename: string; sizeBytes: number; mimeType: string; url: string | null }[];
  /** Backend enum: DRAFT | SUBMITTED | VIEWED | SHORTLISTED | ACCEPTED | REJECTED | WITHDRAWN | EXPIRED */
  status: string;
  submittedAt: string | null;
  withdrawnAt: string | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedProposalResult {
  items: ProposalResponse[];
  meta: { total: number; page: number; limit: number; totalPages: number };
  /** Only on GET /proposals/received: per-status totals (backend enum keys + "all"). */
  counts?: Record<string, number>;
}

const STATUS_FROM_BACKEND: Record<string, ProposalStatus> = {
  DRAFT: PROPOSAL_STATUS.DRAFT,
  SUBMITTED: PROPOSAL_STATUS.SUBMITTED,
  VIEWED: PROPOSAL_STATUS.UNDER_REVIEW,
  SHORTLISTED: PROPOSAL_STATUS.SHORTLISTED,
  ACCEPTED: PROPOSAL_STATUS.ACCEPTED,
  REJECTED: PROPOSAL_STATUS.REJECTED,
  WITHDRAWN: PROPOSAL_STATUS.WITHDRAWN,
  // No "expired" state on the frontend; an expired proposal is no longer active.
  EXPIRED: PROPOSAL_STATUS.WITHDRAWN,
};

const STATUS_TO_BACKEND: Partial<Record<ProposalStatus, string>> = {
  draft: "DRAFT",
  submitted: "SUBMITTED",
  under_review: "VIEWED",
  shortlisted: "SHORTLISTED",
  accepted: "ACCEPTED",
  rejected: "REJECTED",
  withdrawn: "WITHDRAWN",
};

const STATUS_LABEL: Record<ProposalStatus, string> = {
  draft: "Draft saved",
  submitted: "Proposal submitted",
  under_review: "Viewed by client",
  shortlisted: "Shortlisted",
  accepted: "Accepted",
  rejected: "Not selected",
  withdrawn: "Withdrawn",
};

function deliveryFromDays(days: number | null): Proposal["delivery"] {
  if (!days || days <= 0) return { value: 0, unit: "days" };
  if (days % 30 === 0) return { value: days / 30, unit: "months" };
  if (days % 7 === 0) return { value: days / 7, unit: "weeks" };
  return { value: days, unit: "days" };
}

function deliveryToDays(delivery: ProposalInput["delivery"]): number | undefined {
  if (!delivery.value || delivery.value <= 0) return undefined;
  const perUnit = delivery.unit === "months" ? 30 : delivery.unit === "weeks" ? 7 : 1;
  return Math.round(delivery.value * perUnit);
}

/**
 * Maps a backend proposal to the frontend Proposal model. The timeline is
 * derived from the timestamps the backend records (submitted / reviewed /
 * withdrawn); a draft has no submission yet, so its timeline is empty.
 */
export function mapBackendProposal(p: ProposalResponse): Proposal {
  const status = STATUS_FROM_BACKEND[p.status] ?? PROPOSAL_STATUS.SUBMITTED;
  const isDraft = status === PROPOSAL_STATUS.DRAFT;
  const submittedAt = isDraft ? undefined : p.submittedAt ?? p.createdAt;
  const timeline: Proposal["timeline"] = isDraft
    ? []
    : [
        {
          id: `${p.id}-submitted`,
          status: PROPOSAL_STATUS.SUBMITTED,
          label: STATUS_LABEL.submitted,
          at: submittedAt as string,
        },
      ];
  if (!isDraft && status !== PROPOSAL_STATUS.SUBMITTED) {
    timeline.push({
      id: `${p.id}-${status}`,
      status,
      label: STATUS_LABEL[status],
      at: p.withdrawnAt ?? p.reviewedAt ?? p.updatedAt,
    });
  }

  return {
    id: p.id,
    opportunityId: p.jobId,
    jobTitle: p.job?.title,
    freelancerId: p.freelancerId,
    coverLetter: p.coverLetter,
    proposedAmount: Number(p.proposedAmount),
    delivery: deliveryFromDays(p.estimatedDeliveryDays),
    screeningAnswers: (p.screeningAnswers ?? []).map((a) => ({
      questionId: a.questionId,
      answer: a.answer,
    })),
    attachments: (p.attachments ?? []).map((a) => ({
      id: a.id,
      filename: a.filename,
      sizeBytes: a.sizeBytes,
      mimeType: a.mimeType,
    })),
    status,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
    submittedAt,
    timeline,
  };
}

function toBackendStatus(status: ProposalQuery["status"]): string | undefined {
  return status && status !== "all" ? STATUS_TO_BACKEND[status] : undefined;
}

/** The body fields shared by submit and draft-save (ids only for real questions/files). */
function proposalBody(input: ProposalInput) {
  return {
    coverLetter: input.coverLetter,
    proposedAmount: input.proposedAmount,
    estimatedDeliveryDays: deliveryToDays(input.delivery),
    screeningAnswers: (input.screeningAnswers ?? []).map((a) => ({
      questionId: a.questionId,
      answer: a.answer,
    })),
    mediaIds: (input.attachments ?? []).map((a) => a.id),
  };
}

export interface ProposalQuery {
  page?: number;
  limit?: number;
  status?: ProposalStatus | "all";
}

// ── Owner context ─────────────────────────────────────────────

function currentUserId(): string | null {
  const user = getCurrentUser();
  return user?.id ?? null;
}

// ═══════════════════════════════════════════════════════════
// ASYNC BACKEND API
// ═══════════════════════════════════════════════════════════

/**
 * Submit a proposal for a job posting.
 * Endpoint: POST /api/v1/proposals
 */
export async function submitProposalApi(
  input: ProposalInput
): Promise<{ proposal: Proposal | null; error: ApiError | null }> {
  if (input.proposedAmount === undefined) {
    return {
      proposal: null,
      error: { status: 400, message: "Enter the amount you want to charge for this job." } as ApiError,
    };
  }
  const { data, error } = await apiClient.post<Record<string, unknown>, ProposalResponse>(
    "/proposals",
    { jobId: input.opportunityId, ...proposalBody(input) }
  );
  if (!error && data) return { proposal: mapBackendProposal(data), error: null };
  return { proposal: null, error };
}

/**
 * Save (create or update) my private draft for a job. One draft per job; it
 * can be half-written. Submitting later reuses it.
 * Endpoint: POST /api/v1/proposals/drafts
 */
export async function saveProposalDraftApi(
  input: ProposalInput
): Promise<{ proposal: Proposal | null; error: ApiError | null }> {
  const { data, error } = await apiClient.post<Record<string, unknown>, ProposalResponse>(
    "/proposals/drafts",
    { jobId: input.opportunityId, ...proposalBody(input) }
  );
  if (!error && data) return { proposal: mapBackendProposal(data), error: null };
  return { proposal: null, error };
}

/**
 * Submit an existing draft as it is stored.
 * Endpoint: POST /api/v1/proposals/:id/submit
 */
export async function submitProposalDraftApi(
  proposalId: string
): Promise<{ proposal: Proposal | null; error: ApiError | null }> {
  const { data, error } = await apiClient.post<undefined, ProposalResponse>(
    `/proposals/${proposalId}/submit`
  );
  if (!error && data) return { proposal: mapBackendProposal(data), error: null };
  return { proposal: null, error };
}

/** Endpoint: DELETE /api/v1/proposals/:id (drafts only) */
export async function discardProposalDraftApi(
  proposalId: string
): Promise<{ error: ApiError | null }> {
  const { error } = await apiClient.delete<{ success: true }>(`/proposals/${proposalId}`);
  return { error };
}

/** My saved draft for a job, if any (drafts appear in my proposals list). */
export async function getMyDraftForJobApi(
  jobId: string
): Promise<{ draft: Proposal | null; error: ApiError | null }> {
  const { proposals, error } = await getMyProposalsApi({ status: "draft", limit: 100 });
  if (error) return { draft: null, error };
  return { draft: proposals.find((p) => p.opportunityId === jobId) ?? null, error: null };
}

/**
 * List proposals submitted by the current freelancer.
 * Endpoint: GET /api/v1/proposals/me
 */
export async function getMyProposalsApi(
  query: ProposalQuery = {}
): Promise<{ result: PaginatedProposalResult | null; proposals: Proposal[]; error: ApiError | null }> {
  const params = new URLSearchParams();
  if (query.page) params.set("page", String(query.page));
  if (query.limit) params.set("limit", String(query.limit));
  const status = toBackendStatus(query.status);
  if (status) params.set("status", status);
  const qs = params.toString();
  const { data, error } = await apiClient.get<PaginatedProposalResult>(
    `/proposals/me${qs ? `?${qs}` : ""}`
  );
  if (!error && data) {
    return { result: data, proposals: (data.items ?? []).map(mapBackendProposal), error: null };
  }
  return { result: null, proposals: [], error };
}

/**
 * List proposals received on an employer's job.
 * Endpoint: GET /api/v1/proposals/jobs/:jobId
 */
export async function getProposalsForJobApi(
  jobId: string,
  query: ProposalQuery = {}
): Promise<{ result: PaginatedProposalResult | null; proposals: Proposal[]; error: ApiError | null }> {
  const params = new URLSearchParams();
  if (query.page) params.set("page", String(query.page));
  if (query.limit) params.set("limit", String(query.limit));
  const status = toBackendStatus(query.status);
  if (status) params.set("status", status);
  const qs = params.toString();
  const { data, error } = await apiClient.get<PaginatedProposalResult>(
    `/proposals/jobs/${jobId}${qs ? `?${qs}` : ""}`
  );
  if (!error && data) {
    return { result: data, proposals: (data.items ?? []).map(mapBackendProposal), error: null };
  }
  return { result: null, proposals: [], error };
}

/**
 * Get a single proposal by ID (accessible to both freelancer and job owner).
 * Endpoint: GET /api/v1/proposals/:proposalId
 */
export async function getProposalByIdApi(
  proposalId: string
): Promise<{ proposal: Proposal | null; error: ApiError | null }> {
  const { data, error } = await apiClient.get<ProposalResponse>(`/proposals/${proposalId}`);
  if (!error && data) return { proposal: mapBackendProposal(data), error: null };
  return { proposal: null, error };
}

/**
 * Update a draft/submitted proposal (freelancer only).
 * Endpoint: PATCH /api/v1/proposals/:proposalId
 */
export async function updateProposalApi(
  proposalId: string,
  patch: Partial<ProposalInput>
): Promise<{ proposal: Proposal | null; error: ApiError | null }> {
  const { data, error } = await apiClient.patch<Record<string, unknown>, ProposalResponse>(
    `/proposals/${proposalId}`,
    {
      coverLetter: patch.coverLetter,
      proposedAmount: patch.proposedAmount,
      estimatedDeliveryDays: patch.delivery ? deliveryToDays(patch.delivery) : undefined,
    }
  );
  if (!error && data) return { proposal: mapBackendProposal(data), error: null };
  return { proposal: null, error };
}

/**
 * Withdraw a submitted proposal (freelancer only).
 * Endpoint: POST /api/v1/proposals/:proposalId/withdraw
 */
export async function withdrawProposalApi(
  proposalId: string
): Promise<{ proposal: Proposal | null; error: ApiError | null }> {
  const { data, error } = await apiClient.post<undefined, ProposalResponse>(
    `/proposals/${proposalId}/withdraw`
  );
  if (!error && data) return { proposal: mapBackendProposal(data), error: null };
  return { proposal: null, error };
}

// ── Employer actions ──────────────────────────────────────────

type ProposalResult = { proposal: Proposal | null; error: ApiError | null };

/**
 * Shortlist a proposal (employer / job owner only).
 * Endpoint: POST /api/v1/proposals/:proposalId/shortlist
 */
export async function shortlistProposalApi(proposalId: string): Promise<ProposalResult> {
  const { data, error } = await apiClient.post<undefined, ProposalResponse>(
    `/proposals/${proposalId}/shortlist`
  );
  if (!error && data) return { proposal: mapBackendProposal(data), error: null };
  return { proposal: null, error };
}

/**
 * Reject a proposal (employer / job owner only).
 * Endpoint: POST /api/v1/proposals/:proposalId/reject
 */
export async function rejectProposalApi(
  proposalId: string,
  reason?: string
): Promise<ProposalResult> {
  const { data, error } = await apiClient.post<{ reason?: string }, ProposalResponse>(
    `/proposals/${proposalId}/reject`,
    reason ? { reason } : {}
  );
  if (!error && data) return { proposal: mapBackendProposal(data), error: null };
  return { proposal: null, error };
}

/**
 * Accept (hire) a proposal and create the engagement (employer only). Allowed
 * straight from submitted/viewed or after shortlisting.
 * Endpoint: POST /api/v1/proposals/:proposalId/accept
 */
export async function acceptProposalApi(
  proposalId: string
): Promise<{ proposal: Proposal | null; engagementId: string | null; error: ApiError | null }> {
  const { data, error } = await apiClient.post<
    undefined,
    { proposal: ProposalResponse; engagementId: string }
  >(`/proposals/${proposalId}/accept`);
  if (!error && data) {
    return {
      proposal: mapBackendProposal(data.proposal),
      engagementId: data.engagementId,
      error: null,
    };
  }
  return { proposal: null, engagementId: null, error };
}

// ── Employer application read-models ──────────────────────────

const ZERO_COUNTS: Record<EmployerApplicationStatus | "all", number> = {
  submitted: 0,
  under_review: 0,
  shortlisted: 0,
  accepted: 0,
  rejected: 0,
  withdrawn: 0,
  all: 0,
};

const JOB_STATUS_FROM_BACKEND: Record<string, OpportunityStatus> = {
  DRAFT: OPPORTUNITY_STATUS.DRAFT,
  PUBLISHED: OPPORTUNITY_STATUS.OPEN,
  PAUSED: OPPORTUNITY_STATUS.CLOSED,
  CLOSED: OPPORTUNITY_STATUS.CLOSED,
  CANCELLED: OPPORTUNITY_STATUS.CANCELLED,
  EXPIRED: OPPORTUNITY_STATUS.EXPIRED,
};

/** A proposal as the employer sees it: + its job and a public candidate preview. */
export function mapBackendApplication(p: ProposalResponse): EmployerApplicationSummary {
  return {
    proposal: mapBackendProposal(p),
    job: {
      id: p.jobId,
      title: p.job?.title ?? "",
      status: JOB_STATUS_FROM_BACKEND[p.job?.status ?? ""] ?? OPPORTUNITY_STATUS.OPEN,
    },
    candidate: {
      // The freelancer *profile* id: it addresses /freelancers/:id.
      id: p.freelancerId,
      name: p.freelancer?.fullName || p.freelancer?.username || "Freelancer",
      headline: p.freelancer?.headline ?? "",
      avatar: p.freelancer?.avatar ?? undefined,
    },
  };
}

export interface ReceivedApplicationsQuery {
  jobId?: string;
  status?: EmployerApplicationStatus | "all";
  search?: string;
  sort?: string;
  page?: number;
  size?: number;
}

const APPLICATION_SORTS = new Set(["newest", "oldest", "amount_high", "amount_low", "delivery_fast"]);

/**
 * Applications received across my jobs (search, sort and pagination run on
 * the server), plus per-status counts for the filter tabs.
 * Endpoint: GET /api/v1/proposals/received
 */
export async function getReceivedApplicationsApi(
  query: ReceivedApplicationsQuery = {}
): Promise<{ page: EmployerApplicationsPage; error: ApiError | null }> {
  const size = query.size ?? 20;
  const params = new URLSearchParams();
  if (query.jobId) params.set("jobId", query.jobId);
  const status = toBackendStatus(query.status);
  if (status) params.set("status", status);
  if (query.search?.trim()) params.set("search", query.search.trim());
  if (query.sort && APPLICATION_SORTS.has(query.sort)) params.set("sort", query.sort);
  if (query.page) params.set("page", String(query.page));
  params.set("limit", String(size));

  const { data, error } = await apiClient.get<PaginatedProposalResult>(
    `/proposals/received?${params.toString()}`
  );
  if (error || !data) {
    return {
      page: { items: [], total: 0, page: 1, size, totalPages: 1, counts: { ...ZERO_COUNTS } },
      error,
    };
  }

  const counts = { ...ZERO_COUNTS, all: data.counts?.all ?? 0 };
  for (const [backendStatus, n] of Object.entries(data.counts ?? {})) {
    const mapped = STATUS_FROM_BACKEND[backendStatus];
    // EXPIRED folds into "withdrawn" on the frontend, so counts add up.
    if (mapped && mapped !== PROPOSAL_STATUS.DRAFT) counts[mapped] += n;
  }

  return {
    page: {
      items: (data.items ?? []).map(mapBackendApplication),
      total: data.meta?.total ?? 0,
      page: data.meta?.page ?? 1,
      size,
      totalPages: data.meta?.totalPages ?? 1,
      counts,
    },
    error: null,
  };
}

/**
 * One application on one of my jobs. Fetching it as the employer also marks a
 * new proposal as viewed (backend-owned, SUBMITTED -> VIEWED).
 * Endpoint: GET /api/v1/proposals/:proposalId
 */
export async function getApplicationApi(
  proposalId: string
): Promise<{ application: EmployerApplicationSummary | null; error: ApiError | null }> {
  const { data, error } = await apiClient.get<ProposalResponse>(`/proposals/${proposalId}`);
  if (!error && data) return { application: mapBackendApplication(data), error: null };
  return { application: null, error };
}

/**
 * Whether the signed-in user can apply to a backend job. Mirrors what the
 * backend enforces on POST /proposals (job open, freelancer profile exists,
 * one active proposal per job) so the UI can explain it before submitting.
 * The backend remains the authority; skill matching is not enforced there.
 */
export async function getJobEligibilityApi(job: Opportunity): Promise<JobEligibility> {
  if (!getCurrentAuthUser()) {
    return {
      code: ELIGIBILITY_CODE.VERIFICATION_REQUIRED,
      eligible: false,
      reasons: ["Sign in to apply for this opportunity."],
    };
  }
  if (job.status !== OPPORTUNITY_STATUS.OPEN) {
    return {
      code: ELIGIBILITY_CODE.CLOSED,
      eligible: false,
      reasons: ["This opportunity is no longer accepting proposals."],
    };
  }

  const [{ profile }, mine] = await Promise.all([
    getMyFreelancerProfile(),
    getMyProposalsApi({ limit: 100 }),
  ]);
  if (!profile) {
    return {
      code: ELIGIBILITY_CODE.PROFILE_INCOMPLETE,
      eligible: false,
      reasons: ["Create your freelancer profile before applying."],
    };
  }
  // A private draft is not an application; only submitted ones count.
  const existing = mine.proposals.find(
    (p) =>
      p.opportunityId === job.id &&
      p.status !== PROPOSAL_STATUS.WITHDRAWN &&
      p.status !== PROPOSAL_STATUS.DRAFT
  );
  if (existing) {
    return {
      code: ELIGIBILITY_CODE.ALREADY_APPLIED,
      eligible: false,
      reasons: ["You've already submitted a proposal for this opportunity."],
    };
  }
  return {
    code: ELIGIBILITY_CODE.ELIGIBLE,
    eligible: true,
    reasons: ["You're eligible to apply for this opportunity."],
  };
}

// ═══════════════════════════════════════════════════════════
// SYNC HELPERS (offline / mock fallbacks)
// ═══════════════════════════════════════════════════════════

export function getMyProposals(): Proposal[] {
  const uid = currentUserId();
  if (!uid) return [];
  return getProposalsByFreelancer(uid);
}

export function getActiveProposalCount(): number {
  const uid = currentUserId();
  if (!uid) return 0;
  const active: ProposalStatus[] = [
    PROPOSAL_STATUS.SUBMITTED,
    PROPOSAL_STATUS.UNDER_REVIEW,
    PROPOSAL_STATUS.SHORTLISTED,
  ];
  return getProposalsByFreelancer(uid).filter((p) => active.includes(p.status)).length;
}
