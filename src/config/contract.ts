// ============================================================
// FREELANCE CONTRACTS CONFIG  (Module 24)
// ============================================================
// Presentation constants only — labels, colours (as named tokens), and display
// metadata. No business logic, no money math, no status transitions.

import type {
  ContractStatus,
  MilestoneStatus,
  DeliverableStatus,
  TimelineEventType,
} from "@/types/contract";

// ── Contract status metadata ────────────────────────────────

export const CONTRACT_STATUS_META: Record<
  ContractStatus,
  { label: string; icon: "clock" | "check" | "progress" | "x" | "alert" | "review" | "revision" }
> = {
  PENDING_ACCEPTANCE: { label: "Pending Acceptance", icon: "clock" },
  AWAITING_FUNDING: { label: "Awaiting Funding", icon: "clock" },
  ACTIVE: { label: "In Progress", icon: "progress" },
  PAUSED: { label: "Paused", icon: "clock" },
  AWAITING_CLIENT_REVIEW: { label: "Awaiting Client Review", icon: "review" },
  REVISION_REQUESTED: { label: "Revision Requested", icon: "revision" },
  COMPLETED: { label: "Completed", icon: "check" },
  CANCELLED: { label: "Cancelled", icon: "x" },
  DISPUTED: { label: "Disputed", icon: "alert" },
};

/**
 * How many times an employer can send submitted work back. Mirrors the
 * backend's MAX_REVISIONS, which is what actually enforces it — this only
 * lets the UI stop offering the button.
 */
export const MAX_REVISIONS = 3;

// ── Milestone status metadata ───────────────────────────────

export const MILESTONE_STATUS_META: Record<
  MilestoneStatus,
  { label: string; icon: "clock" | "check" | "progress" | "review" | "revision" | "x" }
> = {
  PENDING: { label: "Pending", icon: "clock" },
  ACTIVE: { label: "In Progress", icon: "progress" },
  SUBMITTED: { label: "Submitted", icon: "review" },
  UNDER_REVIEW: { label: "Under Review", icon: "review" },
  REVISION_REQUESTED: { label: "Revision Requested", icon: "revision" },
  COMPLETED: { label: "Completed", icon: "check" },
  CANCELLED: { label: "Cancelled", icon: "x" },
};

// ── Deliverable status metadata ─────────────────────────────

export const DELIVERABLE_STATUS_META: Record<
  DeliverableStatus,
  { label: string; icon: "draft" | "check" | "progress" | "review" | "revision" | "x" }
> = {
  DRAFT: { label: "Draft", icon: "draft" },
  SUBMITTED: { label: "Submitted", icon: "progress" },
  UNDER_REVIEW: { label: "Under Review", icon: "review" },
  REVISION_REQUESTED: { label: "Revision Requested", icon: "revision" },
  APPROVED: { label: "Approved", icon: "check" },
  REJECTED: { label: "Rejected", icon: "x" },
  COMPLETED: { label: "Completed", icon: "check" },
};

// ── Timeline event metadata ─────────────────────────────────

export const TIMELINE_EVENT_META: Record<
  TimelineEventType,
  { label: string; icon: "create" | "accept" | "start" | "milestone" | "submit" | "review" | "revision" | "approve" | "complete" | "cancel" | "alert" }
> = {
  CONTRACT_CREATED: { label: "Contract Created", icon: "create" },
  CONTRACT_ACCEPTED: { label: "Contract Accepted", icon: "accept" },
  PROJECT_STARTED: { label: "Project Started", icon: "start" },
  MILESTONE_STARTED: { label: "Milestone Started", icon: "milestone" },
  DELIVERABLE_SUBMITTED: { label: "Deliverable Submitted", icon: "submit" },
  CLIENT_REVIEWED: { label: "Client Reviewed", icon: "review" },
  REVISION_REQUESTED: { label: "Revision Requested", icon: "revision" },
  DELIVERABLE_RESUBMITTED: { label: "Deliverable Resubmitted", icon: "submit" },
  DELIVERABLE_APPROVED: { label: "Deliverable Approved", icon: "approve" },
  MILESTONE_COMPLETED: { label: "Milestone Completed", icon: "approve" },
  PROJECT_COMPLETED: { label: "Project Completed", icon: "complete" },
  CONTRACT_CANCELLED: { label: "Contract Cancelled", icon: "cancel" },
  DISPUTE_OPENED: { label: "Dispute Opened", icon: "alert" },
};
