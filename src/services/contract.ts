
import { listMyEngagements, type Engagement, type EngagementStatus } from "@/services/jobs";
import type { Contract, ContractStatus } from "@/types/contract";
import { CONTRACT_STATUS } from "@/types/contract";

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
