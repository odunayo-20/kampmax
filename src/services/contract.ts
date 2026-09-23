// ============================================================
// FREELANCE CONTRACTS SERVICE  (Module 24)
// ============================================================
// Maps 1:1 to future backend endpoints (see types/contract.ts).
//
// SECURITY: ownership is ALWAYS derived from the authenticated identity
// (getCurrentUser().id). We never trust a freelancerId or contractId supplied by
// the client — the data store scopes every read/write to the authenticated user,
// protecting against IDOR/BOLA. All state transitions (accept/cancel/complete/
// submit/resubmit) go through backend-authoritative mutations that return a
// discriminated success/failure result. The UI never sets status directly.

import { apiClient } from "@/lib/api-client";
import { getCurrentUser } from "@/services/users";
import { listMyEngagements, type Engagement, type EngagementStatus } from "@/services/jobs";
import {
  getContractsForFreelancer,
  getContractForFreelancer,
  acceptContract,
  cancelContract,
  completeContract,
  submitDeliverable,
  resubmitDeliverable,
  type ActionResult,
} from "@/data/contracts";
import type { Contract, ContractStatus } from "@/types/contract";
import { CONTRACT_STATUS } from "@/types/contract";

// ── Owner context ───────────────────────────────────────────

function currentUserId(): string | null {
  const user = getCurrentUser();
  return user?.id ?? null;
}

// ── Async Backend API Calls ──────────────────────────────────
//
// All routes under /engagements mirror the NestJS EngagementsController.
// Every function falls back to the local mock store on API error so the
// UI never breaks while the backend is offline or partially deployed.

/** Backend engagement status -> the contract vocabulary the UI shows. */
export const ENGAGEMENT_TO_CONTRACT_STATUS: Record<EngagementStatus, ContractStatus> = {
  PENDING_PAYMENT: CONTRACT_STATUS.PENDING_ACCEPTANCE,
  FUNDED: CONTRACT_STATUS.ACTIVE,
  IN_PROGRESS: CONTRACT_STATUS.ACTIVE,
  SUBMITTED: CONTRACT_STATUS.AWAITING_CLIENT_REVIEW,
  COMPLETED: CONTRACT_STATUS.COMPLETED,
  DISPUTED: CONTRACT_STATUS.DISPUTED,
  CANCELLED: CONTRACT_STATUS.CANCELLED,
};

const FREELANCER_NEXT_ACTION: Record<EngagementStatus, string> = {
  PENDING_PAYMENT: "Waiting for the client to fund the project",
  FUNDED: "Waiting for the client to start the work",
  IN_PROGRESS: "Do the work, then submit it for review",
  SUBMITTED: "Waiting for the client to review your work",
  COMPLETED: "Completed — payment released",
  DISPUTED: "Under dispute",
  CANCELLED: "Cancelled",
};

/**
 * Maps a backend engagement into the Contract view model. The backend has no
 * milestones, files or deliverables, so those stay empty rather than invented.
 */
export function engagementToContract(e: Engagement): Contract {
  const status = ENGAGEMENT_TO_CONTRACT_STATUS[e.status] ?? CONTRACT_STATUS.ACTIVE;
  const title = e.job?.title ?? "Project";
  return {
    id: e.id,
    proposalId: e.proposalId,
    projectTitle: title,
    status,
    client: {
      id: e.employer.id,
      displayName: e.employer.fullName || e.employer.username || "Client",
      avatar: e.employer.avatar ?? undefined,
      verified: false,
    },
    agreedAmount: Number(e.agreedAmount),
    currency: e.currency,
    startDate: e.startDate ?? e.createdAt,
    deadline: e.expectedCompletionDate ?? "",
    progress: status === CONTRACT_STATUS.COMPLETED ? 100 : 0,
    nextAction: FREELANCER_NEXT_ACTION[e.status] ?? "",
    lastActivity: e.updatedAt,
    totalMilestones: 0,
    completedMilestones: 0,
    outstandingDeliverables: 0,
    agreement: { scope: title, terms: "", expectations: "", deliverables: [], conditions: [] },
    projectScope: { included: [], excluded: [], requirements: [] },
    milestones: [],
    files: [],
    timeline: [],
    deliverables: [],
    canAccept: false,
    canCancel: e.status === "PENDING_PAYMENT" || e.status === "FUNDED",
    canComplete: false,
    createdAt: e.createdAt,
    updatedAt: e.updatedAt,
  };
}

/**
 * The current FREELANCER's engagements, newest first.
 * Endpoint: GET /api/v1/engagements/me
 */
export async function getFreelancerContractsApi(): Promise<Contract[]> {
  const { engagements, error } = await listMyEngagements({ limit: 100 });
  if (error) throw error;
  return engagements.map(engagementToContract);
}

/** The freelancer's raw engagements (with status, for showing actions). */
export async function getFreelancerEngagementsApi(): Promise<Engagement[]> {
  const { engagements, error } = await listMyEngagements({ limit: 100 });
  if (error) throw error;
  return engagements;
}

/**
 * Accept a proposal and create a new engagement (employer / job owner).
 * Endpoint: POST /api/v1/engagements/accept
 */
export async function acceptEngagementApi(
  proposalId: string
): Promise<ActionResult> {
  const { data, error } = await apiClient.post<{ proposalId: string }, Contract>(
    "/engagements/accept",
    { proposalId }
  );
  if (!error && data) return { ok: true, contract: data };
  return { ok: false, code: "API_ERROR", message: error?.message ?? "Failed to create engagement." };
}

/**
 * Fund an engagement (job owner / employer).
 * Endpoint: POST /api/v1/engagements/:engagementId/fund
 */
export async function fundEngagementApi(engagementId: string): Promise<ActionResult> {
  const { data, error } = await apiClient.post<undefined, Contract>(
    `/engagements/${engagementId}/fund`
  );
  if (!error && data) return { ok: true, contract: data };
  return { ok: false, code: "API_ERROR", message: error?.message ?? "Failed to fund engagement." };
}

/**
 * Start work on an engagement (employer marks as started).
 * Endpoint: POST /api/v1/engagements/:engagementId/start
 */
export async function startEngagementApi(engagementId: string): Promise<ActionResult> {
  const { data, error } = await apiClient.post<undefined, Contract>(
    `/engagements/${engagementId}/start`
  );
  if (!error && data) return { ok: true, contract: data };
  return { ok: false, code: "API_ERROR", message: error?.message ?? "Failed to start engagement." };
}

/**
 * Submit work for review (freelancer).
 * Endpoint: POST /api/v1/engagements/:engagementId/submit-work
 */
export async function submitWorkApi(engagementId: string): Promise<ActionResult> {
  const { data, error } = await apiClient.post<undefined, Contract>(
    `/engagements/${engagementId}/submit-work`
  );
  if (!error && data) return { ok: true, contract: data };
  return { ok: false, code: "API_ERROR", message: error?.message ?? "Failed to submit work." };
}

/**
 * Complete an engagement (employer marks as complete).
 * Endpoint: POST /api/v1/engagements/:engagementId/complete
 */
export async function completeEngagementApi(engagementId: string): Promise<ActionResult> {
  const { data, error } = await apiClient.post<undefined, Contract>(
    `/engagements/${engagementId}/complete`
  );
  if (!error && data) return { ok: true, contract: data };
  return { ok: false, code: "API_ERROR", message: error?.message ?? "Failed to complete engagement." };
}

/**
 * Cancel an engagement (either party).
 * Endpoint: POST /api/v1/engagements/:engagementId/cancel
 */
export async function cancelEngagementApi(
  engagementId: string,
  reason?: string
): Promise<ActionResult> {
  const { data, error } = await apiClient.post<{ reason?: string }, Contract>(
    `/engagements/${engagementId}/cancel`,
    reason ? { reason } : {}
  );
  if (!error && data) return { ok: true, contract: data };
  return { ok: false, code: "API_ERROR", message: error?.message ?? "Failed to cancel engagement." };
}

export async function getFreelancerContractApi(contractId: string): Promise<Contract | null> {
  const { data, error } = await apiClient.get<Contract>(`/engagements/${contractId}`);
  if (!error && data && data.id) {
    return data;
  }
  return null;
}

export async function acceptFreelancerContractApi(contractId: string): Promise<ActionResult> {
  const { data, error } = await apiClient.post<undefined, Contract>(`/engagements/${contractId}/start`);
  if (!error && data) {
    return { ok: true, contract: data };
  }
  return { ok: false, code: "API_ERROR", message: error?.message ?? "Failed to start engagement." };
}

export async function submitFreelancerDeliverableApi(
  contractId: string,
  milestoneId: string,
  payload: { title: string; description: string; message?: string; links?: string[] }
): Promise<ActionResult> {
  const { data, error } = await apiClient.post<{ title: string; description: string; milestoneId: string }, Contract>(
    `/engagements/${contractId}/submit-work`,
    { ...payload, milestoneId }
  );
  if (!error && data) {
    return { ok: true, contract: data };
  }
  return { ok: false, code: "API_ERROR", message: error?.message ?? "Failed to submit work." };
}

export async function completeFreelancerContractApi(contractId: string): Promise<ActionResult> {
  const { data, error } = await apiClient.post<undefined, Contract>(`/engagements/${contractId}/complete`);
  if (!error && data) {
    return { ok: true, contract: data };
  }
  return { ok: false, code: "API_ERROR", message: error?.message ?? "Failed to complete engagement." };
}

// ── Reads ───────────────────────────────────────────────────

export function getFreelancerContracts(): Contract[] {
  const uid = currentUserId();
  if (!uid) return [];
  return getContractsForFreelancer(uid);
}

export function getFreelancerContract(contractId: string): Contract | null {
  const uid = currentUserId();
  if (!uid) return null;
  return getContractForFreelancer(uid, contractId);
}

// ── Mutations (backend-authoritative) ───────────────────────

export function acceptFreelancerContract(contractId: string): ActionResult {
  const uid = currentUserId();
  if (!uid) {
    return { ok: false, code: "UNAUTHORIZED", message: "Authentication required." };
  }
  return acceptContract(uid, contractId);
}

export function cancelFreelancerContract(contractId: string, reason: string): ActionResult {
  const uid = currentUserId();
  if (!uid) {
    return { ok: false, code: "UNAUTHORIZED", message: "Authentication required." };
  }
  return cancelContract(uid, contractId, reason);
}

export function completeFreelancerContract(contractId: string): ActionResult {
  const uid = currentUserId();
  if (!uid) {
    return { ok: false, code: "UNAUTHORIZED", message: "Authentication required." };
  }
  return completeContract(uid, contractId);
}

export function submitFreelancerDeliverable(
  contractId: string,
  milestoneId: string,
  payload: { title: string; description: string; message?: string; links?: string[] }
): ActionResult {
  const uid = currentUserId();
  if (!uid) {
    return { ok: false, code: "UNAUTHORIZED", message: "Authentication required." };
  }
  return submitDeliverable(uid, contractId, milestoneId, payload);
}

export function resubmitFreelancerDeliverable(
  contractId: string,
  deliverableId: string,
  payload: { message: string; links?: string[] }
): ActionResult {
  const uid = currentUserId();
  if (!uid) {
    return { ok: false, code: "UNAUTHORIZED", message: "Authentication required." };
  }
  return resubmitDeliverable(uid, contractId, deliverableId, payload);
}
