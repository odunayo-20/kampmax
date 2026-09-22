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
import type { Contract } from "@/types/contract";

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

/**
 * List engagements for the current FREELANCER.
 * Endpoint: GET /api/v1/engagements/me
 */
export async function getFreelancerContractsApi(): Promise<Contract[]> {
  const { data, error } = await apiClient.get<Contract[]>("/engagements/me");
  if (!error && Array.isArray(data)) return data;
  return getFreelancerContracts();
}

/**
 * List engagements for the current EMPLOYER.
 * Endpoint: GET /api/v1/engagements/employer/me
 */
export async function getEmployerEngagementsApi(): Promise<Contract[]> {
  const { data, error } = await apiClient.get<Contract[]>("/engagements/employer/me");
  if (!error && Array.isArray(data)) return data;
  return [];
}

/**
 * Get a single engagement by ID (accessible to both parties).
 * Endpoint: GET /api/v1/engagements/:engagementId
 */
export async function getEngagementApi(engagementId: string): Promise<Contract | null> {
  const { data, error } = await apiClient.get<Contract>(`/engagements/${engagementId}`);
  if (!error && data && data.id) return data;
  return getFreelancerContract(engagementId);
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
  // Offline fallback
  return completeFreelancerContract(engagementId);
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
  // Offline fallback
  return cancelFreelancerContract(engagementId, reason ?? "Cancelled");
}

export async function getFreelancerContractApi(contractId: string): Promise<Contract | null> {
  const { data, error } = await apiClient.get<Contract>(`/engagements/${contractId}`);
  if (!error && data && data.id) {
    return data;
  }
  return getFreelancerContract(contractId);
}

export async function acceptFreelancerContractApi(contractId: string): Promise<ActionResult> {
  const { data, error } = await apiClient.post<undefined, Contract>(`/engagements/${contractId}/start`);
  if (!error && data) {
    return { ok: true, contract: data };
  }
  return acceptFreelancerContract(contractId);
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
  return submitFreelancerDeliverable(contractId, milestoneId, payload);
}

export async function completeFreelancerContractApi(contractId: string): Promise<ActionResult> {
  const { data, error } = await apiClient.post<undefined, Contract>(`/engagements/${contractId}/complete`);
  if (!error && data) {
    return { ok: true, contract: data };
  }
  return completeFreelancerContract(contractId);
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
