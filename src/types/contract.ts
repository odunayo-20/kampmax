// ============================================================
// FREELANCE CONTRACT TYPES  (Module 24)
// ============================================================
//
// Maps 1:1 to future backend endpoints:
//   GET    /freelancer/contracts           → list
//   GET    /freelancer/contracts/:id       → detail
//   POST   /freelancer/contracts/:id/accept
//   GET    /freelancer/contracts/:id/milestones
//   GET    /freelancer/contracts/:id/deliverables
//   POST   /freelancer/contracts/:id/deliverables
//   POST   /freelancer/contracts/:id/deliverables/:did/resubmit
//   POST   /freelancer/contracts/:id/cancel
//   POST   /freelancer/contracts/:id/complete
//   GET    /freelancer/contracts/:id/timeline
//   GET    /freelancer/contracts/:id/files
//
// BACKEND-AUTHORITATIVE: all statuses, transitions, progress, deadlines,
// acceptance, cancellation, disputes, and completion are server-owned.

// ── Contract status ─────────────────────────────────────────

export const CONTRACT_STATUS = {
  PENDING_ACCEPTANCE: "PENDING_ACCEPTANCE",
  /** Hired, but the client hasn't put the payment in escrow yet. */
  AWAITING_FUNDING: "AWAITING_FUNDING",
  ACTIVE: "ACTIVE",
  PAUSED: "PAUSED",
  AWAITING_CLIENT_REVIEW: "AWAITING_CLIENT_REVIEW",
  REVISION_REQUESTED: "REVISION_REQUESTED",
  COMPLETED: "COMPLETED",
  CANCELLED: "CANCELLED",
  DISPUTED: "DISPUTED",
} as const;

export type ContractStatus = (typeof CONTRACT_STATUS)[keyof typeof CONTRACT_STATUS];

// ── Milestone status ────────────────────────────────────────

export const MILESTONE_STATUS = {
  PENDING: "PENDING",
  ACTIVE: "ACTIVE",
  SUBMITTED: "SUBMITTED",
  UNDER_REVIEW: "UNDER_REVIEW",
  REVISION_REQUESTED: "REVISION_REQUESTED",
  COMPLETED: "COMPLETED",
  CANCELLED: "CANCELLED",
} as const;

export type MilestoneStatus = (typeof MILESTONE_STATUS)[keyof typeof MILESTONE_STATUS];

// ── Deliverable status ──────────────────────────────────────

export const DELIVERABLE_STATUS = {
  DRAFT: "DRAFT",
  SUBMITTED: "SUBMITTED",
  UNDER_REVIEW: "UNDER_REVIEW",
  REVISION_REQUESTED: "REVISION_REQUESTED",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
  COMPLETED: "COMPLETED",
} as const;

export type DeliverableStatus = (typeof DELIVERABLE_STATUS)[keyof typeof DELIVERABLE_STATUS];

// ── Timeline event type ─────────────────────────────────────

export const TIMELINE_EVENT_TYPE = {
  CONTRACT_CREATED: "CONTRACT_CREATED",
  CONTRACT_ACCEPTED: "CONTRACT_ACCEPTED",
  PROJECT_STARTED: "PROJECT_STARTED",
  MILESTONE_STARTED: "MILESTONE_STARTED",
  DELIVERABLE_SUBMITTED: "DELIVERABLE_SUBMITTED",
  CLIENT_REVIEWED: "CLIENT_REVIEWED",
  REVISION_REQUESTED: "REVISION_REQUESTED",
  DELIVERABLE_RESUBMITTED: "DELIVERABLE_RESUBMITTED",
  DELIVERABLE_APPROVED: "DELIVERABLE_APPROVED",
  MILESTONE_COMPLETED: "MILESTONE_COMPLETED",
  PROJECT_COMPLETED: "PROJECT_COMPLETED",
  CONTRACT_CANCELLED: "CONTRACT_CANCELLED",
  DISPUTE_OPENED: "DISPUTE_OPENED",
} as const;

export type TimelineEventType = (typeof TIMELINE_EVENT_TYPE)[keyof typeof TIMELINE_EVENT_TYPE];

// ── Sub-types ───────────────────────────────────────────────

export interface ContractClient {
  id: string;
  displayName: string;
  avatar?: string;
  organization?: string;
  verified: boolean;
}

export interface ContractAgreement {
  scope: string;
  terms: string;
  expectations: string;
  deliverables: string[];
  conditions: string[];
}

export interface ContractProjectScope {
  included: string[];
  excluded: string[];
  requirements: string[];
}

export interface ContractFile {
  id: string;
  filename: string;
  fileType: string;
  size: number;
  uploadedBy: string;
  uploadedAt: string;
  url: string;
}

export interface MilestoneDeliverable {
  id: string;
  title: string;
  status: DeliverableStatus;
  submittedAt?: string;
}

export interface Milestone {
  id: string;
  contractId: string;
  title: string;
  description: string;
  dueDate: string;
  status: MilestoneStatus;
  progress: number;
  deliverables: MilestoneDeliverable[];
  completedAt?: string;
}

export interface Deliverable {
  id: string;
  contractId: string;
  milestoneId: string;
  title: string;
  description: string;
  status: DeliverableStatus;
  submittedAt?: string;
  submittedMessage?: string;
  files: ContractFile[];
  links: string[];
  clientFeedback?: string;
  revisionCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface ContractTimelineEvent {
  id: string;
  type: TimelineEventType;
  timestamp: string;
  actor: {
    displayName: string;
    avatar?: string;
  };
  description: string;
  milestoneId?: string;
  deliverableId?: string;
}

export interface Contract {
  id: string;
  proposalId?: string;
  projectTitle: string;
  status: ContractStatus;
  client: ContractClient;
  agreedAmount?: number;
  currency: string;
  startDate: string;
  deadline: string;
  progress: number;
  currentMilestone?: string;
  nextAction: string;
  lastActivity: string;
  totalMilestones: number;
  completedMilestones: number;
  outstandingDeliverables: number;
  agreement: ContractAgreement;
  projectScope: ContractProjectScope;
  milestones: Milestone[];
  files: ContractFile[];
  timeline: ContractTimelineEvent[];
  deliverables: Deliverable[];
  canAccept: boolean;
  canCancel: boolean;
  canComplete: boolean;
  cancellationReason?: string;
  disputeStatus?: string;
  createdAt: string;
  updatedAt: string;
}
