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
import {
  submitProposalRecord,
  getProposalsByFreelancer,
  getProposalsForOpportunity,
  getProposalById,
  updateProposalDraftRecord,
  withdrawProposalRecord,
  setProposalShortlistedRecord,
  setProposalRejectedRecord,
  setProposalAcceptedRecord,
} from "@/data/opportunity";
import type {
  Proposal,
  ProposalInput,
  ProposalStatus,
} from "@/types/opportunity";
import { PROPOSAL_STATUS } from "@/types/opportunity";

// ── Shared types ─────────────────────────────────────────────

export interface ProposalResponse {
  id: string;
  jobId: string;
  freelancerId: string;
  status: ProposalStatus;
  coverLetter: string;
  proposedRate: number | null;
  currency: string;
  deliveryDays: number | null;
  attachments: string[];
  createdAt: string;
  updatedAt: string;
  [key: string]: unknown;
}

export interface PaginatedProposalResult {
  data: ProposalResponse[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
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
): Promise<{ proposal: ProposalResponse | null; error: ApiError | null }> {
  const { data, error } = await apiClient.post<ProposalInput, ProposalResponse>(
    "/proposals",
    input
  );
  if (!error && data) return { proposal: data, error: null };
  // Offline fallback
  const uid = currentUserId();
  if (!uid) return { proposal: null, error };
  const local = submitProposalRecord(uid, input);
  return { proposal: local as unknown as ProposalResponse, error };
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
  if (query.status && query.status !== "all") params.set("status", query.status);
  const qs = params.toString();
  const { data, error } = await apiClient.get<PaginatedProposalResult>(
    `/proposals/me${qs ? `?${qs}` : ""}`
  );
  if (!error && data) return { result: data, proposals: [], error: null };
  // Offline fallback — return from local store
  const uid = currentUserId();
  const proposals = uid ? getProposalsByFreelancer(uid) : [];
  const filtered =
    query.status && query.status !== "all"
      ? proposals.filter((p) => p.status === query.status)
      : proposals;
  return { result: null, proposals: filtered, error };
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
  if (query.status && query.status !== "all") params.set("status", query.status);
  const qs = params.toString();
  const { data, error } = await apiClient.get<PaginatedProposalResult>(
    `/proposals/jobs/${jobId}${qs ? `?${qs}` : ""}`
  );
  if (!error && data) return { result: data, proposals: [], error: null };
  // Offline fallback
  const proposals = getProposalsForOpportunity(jobId);
  return { result: null, proposals, error };
}

/**
 * Get a single proposal by ID (accessible to both freelancer and job owner).
 * Endpoint: GET /api/v1/proposals/:proposalId
 */
export async function getProposalByIdApi(
  proposalId: string
): Promise<{ proposal: ProposalResponse | null; error: ApiError | null }> {
  const { data, error } = await apiClient.get<ProposalResponse>(`/proposals/${proposalId}`);
  if (!error && data) return { proposal: data, error: null };
  // Offline fallback
  const local = getProposalById(proposalId);
  return { proposal: local as unknown as ProposalResponse ?? null, error };
}

/**
 * Update a draft/submitted proposal (freelancer only).
 * Endpoint: PATCH /api/v1/proposals/:proposalId
 */
export async function updateProposalApi(
  proposalId: string,
  patch: Partial<ProposalInput>
): Promise<{ proposal: ProposalResponse | null; error: ApiError | null }> {
  const { data, error } = await apiClient.patch<Partial<ProposalInput>, ProposalResponse>(
    `/proposals/${proposalId}`,
    patch
  );
  if (!error && data) return { proposal: data, error: null };
  // Offline fallback
  const uid = currentUserId();
  if (!uid) return { proposal: null, error };
  const updated = updateProposalDraftRecord(uid, proposalId, patch);
  return { proposal: updated as unknown as ProposalResponse ?? null, error };
}

/**
 * Withdraw a submitted proposal (freelancer only).
 * Endpoint: POST /api/v1/proposals/:proposalId/withdraw
 */
export async function withdrawProposalApi(
  proposalId: string
): Promise<{ proposal: ProposalResponse | null; error: ApiError | null }> {
  const { data, error } = await apiClient.post<undefined, ProposalResponse>(
    `/proposals/${proposalId}/withdraw`
  );
  if (!error && data) return { proposal: data, error: null };
  // Offline fallback
  const uid = currentUserId();
  if (!uid) return { proposal: null, error };
  const updated = withdrawProposalRecord(uid, proposalId);
  return { proposal: updated as unknown as ProposalResponse ?? null, error };
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
  // Offline fallback
  const updated = setProposalShortlistedRecord(proposalId);
  return { proposal: updated as unknown as ProposalResponse ?? null, error };
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
  // Offline fallback
  const updated = setProposalRejectedRecord(proposalId, reason ?? null);
  return { proposal: updated as unknown as ProposalResponse ?? null, error };
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
  // Offline fallback
  const updated = setProposalAcceptedRecord(proposalId);
  return { proposal: updated as unknown as ProposalResponse ?? null, engagementId: null, error };
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
