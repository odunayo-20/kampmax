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
  JobEligibility,
  Opportunity,
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
  job?: { id: string; title: string; slug: string };
  freelancerId: string;
  coverLetter: string;
  proposedAmount: number | string;
  currency: string;
  estimatedDeliveryDays: number | null;
  /** Backend enum: SUBMITTED | VIEWED | SHORTLISTED | ACCEPTED | REJECTED | WITHDRAWN | EXPIRED */
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
}

const STATUS_FROM_BACKEND: Record<string, ProposalStatus> = {
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
 * Maps a backend proposal to the frontend Proposal model. The backend has no
 * drafts, screening answers or attachments, so those are empty; the timeline
 * is derived from the timestamps the backend does record.
 */
export function mapBackendProposal(p: ProposalResponse): Proposal {
  const status = STATUS_FROM_BACKEND[p.status] ?? PROPOSAL_STATUS.SUBMITTED;
  const submittedAt = p.submittedAt ?? p.createdAt;
  const timeline: Proposal["timeline"] = [
    { id: `${p.id}-submitted`, status: PROPOSAL_STATUS.SUBMITTED, label: STATUS_LABEL.submitted, at: submittedAt },
  ];
  if (status !== PROPOSAL_STATUS.SUBMITTED) {
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
    screeningAnswers: [],
    attachments: [],
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
    {
      jobId: input.opportunityId,
      coverLetter: input.coverLetter,
      proposedAmount: input.proposedAmount,
      estimatedDeliveryDays: deliveryToDays(input.delivery),
    }
  );
  if (!error && data) return { proposal: mapBackendProposal(data), error: null };
  return { proposal: null, error };
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

/**
 * Shortlist a proposal (employer / job owner only).
 * Endpoint: POST /api/v1/proposals/:proposalId/shortlist
 */
export async function shortlistProposalApi(
  proposalId: string
): Promise<{ proposal: ProposalResponse | null; error: ApiError | null }> {
  const { data, error } = await apiClient.post<undefined, ProposalResponse>(
    `/proposals/${proposalId}/shortlist`
  );
  if (!error && data) return { proposal: data, error: null };
  return { proposal: null, error };
}

/**
 * Reject a proposal (employer / job owner only).
 * Endpoint: POST /api/v1/proposals/:proposalId/reject
 */
export async function rejectProposalApi(
  proposalId: string,
  reason?: string
): Promise<{ proposal: ProposalResponse | null; error: ApiError | null }> {
  const { data, error } = await apiClient.post<{ reason?: string }, ProposalResponse>(
    `/proposals/${proposalId}/reject`,
    reason ? { reason } : {}
  );
  if (!error && data) return { proposal: data, error: null };
  return { proposal: null, error };
}

/**
 * Accept a proposal and create an engagement (employer / job owner only).
 * Endpoint: POST /api/v1/proposals/:proposalId/accept
 * Returns both the updated proposal and the new engagementId.
 */
export async function acceptProposalApi(
  proposalId: string
): Promise<{
  proposal: ProposalResponse | null;
  engagementId: string | null;
  error: ApiError | null;
}> {
  const { data, error } = await apiClient.post<
    undefined,
    { proposal: ProposalResponse; engagementId: string }
  >(`/proposals/${proposalId}/accept`);
  if (!error && data) {
    return { proposal: data.proposal, engagementId: data.engagementId, error: null };
  }
  return { proposal: null, engagementId: null, error };
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
  const existing = mine.proposals.find(
    (p) => p.opportunityId === job.id && p.status !== PROPOSAL_STATUS.WITHDRAWN
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
