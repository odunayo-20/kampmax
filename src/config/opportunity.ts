// ============================================================
// FIND WORK & PROPOSALS CONFIG  (Module 23C)
// ============================================================
// Presentation constants for the freelancer Find Work + proposal
// workflow. No business logic — labels, filter options, sort options
// and metadata only. Statuses, eligibility and ownership are
// backend-authoritative (defined in types).

import type {
  OpportunityDuration,
  OpportunityStatus,
  OpportunityWorkArrangement,
  ProposalStatus,
} from "@/types/opportunity";
import { OPPORTUNITY_STATUS, PROPOSAL_STATUS } from "@/types/opportunity";
import { EMPLOYER_EXPERIENCE_LEVELS } from "@/config/employer";

// Job categories and skills come from the taxonomy API (JOB / SKILL types).

export { EMPLOYER_EXPERIENCE_LEVELS as JOB_EXPERIENCE_LEVELS };

export { OPPORTUNITY_STATUS, PROPOSAL_STATUS };

// ── Work arrangement labels ─────────────────────────────────

export const WORK_ARRANGEMENT_LABEL: Record<OpportunityWorkArrangement, string> = {
  remote: "Remote",
  on_site: "On-site",
  on_campus: "On-campus",
  hybrid: "Hybrid",
};

export const JOB_WORK_ARRANGEMENT_OPTIONS: {
  value: OpportunityWorkArrangement;
  label: string;
}[] = [
  { value: "remote", label: "Remote" },
  { value: "on_site", label: "On-site" },
  { value: "on_campus", label: "On-campus" },
  { value: "hybrid", label: "Hybrid" },
];

// ── Duration labels ─────────────────────────────────────────

export const DURATION_LABEL: Record<OpportunityDuration, string> = {
  short_term: "Short-term (days)",
  few_weeks: "A few weeks",
  one_to_three_months: "1–3 months",
  long_term: "3+ months / ongoing",
};

// ── Opportunity status meta (badge tone) ────────────────────

export interface OpportunityStatusMeta {
  label: string;
  tone: "default" | "success" | "warning" | "error" | "info" | "outline";
  hint: string;
}

export const OPPORTUNITY_STATUS_META: Record<OpportunityStatus, OpportunityStatusMeta> = {
  [OPPORTUNITY_STATUS.OPEN]: {
    label: "Open",
    tone: "success",
    hint: "Accepting proposals.",
  },
  [OPPORTUNITY_STATUS.CLOSED]: {
    label: "Closed",
    tone: "default",
    hint: "No longer accepting proposals.",
  },
  [OPPORTUNITY_STATUS.EXPIRED]: {
    label: "Expired",
    tone: "default",
    hint: "The submission deadline has passed.",
  },
  [OPPORTUNITY_STATUS.CANCELLED]: {
    label: "Cancelled",
    tone: "error",
    hint: "This opportunity was cancelled.",
  },
  [OPPORTUNITY_STATUS.DRAFT]: {
    label: "Draft",
    tone: "outline",
    hint: "Saved but not published.",
  },
  [OPPORTUNITY_STATUS.PENDING_REVIEW]: {
    label: "Pending Review",
    tone: "warning",
    hint: "Awaiting moderation.",
  },
};

// ── Proposal status meta ────────────────────────────────────

export interface ProposalStatusMeta {
  label: string;
  tone: "default" | "success" | "warning" | "error" | "info" | "outline";
  hint: string;
}

export const PROPOSAL_STATUS_META: Record<ProposalStatus, ProposalStatusMeta> = {
  [PROPOSAL_STATUS.DRAFT]: { label: "Draft", tone: "outline", hint: "Not yet submitted." },
  [PROPOSAL_STATUS.SUBMITTED]: { label: "Submitted", tone: "info", hint: "Sent to the client." },
  [PROPOSAL_STATUS.UNDER_REVIEW]: { label: "Under Review", tone: "warning", hint: "The client is reviewing proposals." },
  [PROPOSAL_STATUS.SHORTLISTED]: { label: "Shortlisted", tone: "info", hint: "You've been shortlisted." },
  [PROPOSAL_STATUS.ACCEPTED]: { label: "Accepted", tone: "success", hint: "The client accepted your proposal." },
  [PROPOSAL_STATUS.REJECTED]: { label: "Rejected", tone: "error", hint: "This proposal was not selected." },
  [PROPOSAL_STATUS.WITHDRAWN]: { label: "Withdrawn", tone: "default", hint: "You withdrew this proposal." },
};

// ── Proposal filter tabs (only statuses we expose) ─────────

export const PROPOSAL_FILTER_TABS: {
  value: ProposalStatus | "all";
  label: string;
}[] = [
  { value: "all", label: "All" },
  { value: PROPOSAL_STATUS.DRAFT, label: "Drafts" },
  { value: PROPOSAL_STATUS.SUBMITTED, label: "Submitted" },
  { value: PROPOSAL_STATUS.UNDER_REVIEW, label: "Under Review" },
  { value: PROPOSAL_STATUS.SHORTLISTED, label: "Shortlisted" },
  { value: PROPOSAL_STATUS.ACCEPTED, label: "Accepted" },
  { value: PROPOSAL_STATUS.REJECTED, label: "Rejected" },
  { value: PROPOSAL_STATUS.WITHDRAWN, label: "Withdrawn" },
];

// ── Sort options (backend-supported presentation) ───────────

export const OPPORTUNITY_SORT_OPTIONS: {
  value: "newest" | "oldest" | "budget_high" | "budget_low" | "deadline";
  label: string;
}[] = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "budget_high", label: "Budget: High to low" },
  { value: "budget_low", label: "Budget: Low to high" },
  { value: "deadline", label: "Closest deadline" },
];

// ── Allowed external URL schemes (safe URL validation) ──────

export const OPPORTUNITY_SAFE_SCHEMES = ["https:", "http:"] as const;

// ── Allowed proposal attachment types/size (UX validation only) ──

export const PROPOSAL_ATTACHMENT_ALLOWED = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/png",
  "image/jpeg",
] as const;

export const PROPOSAL_ATTACHMENT_MAX_BYTES = 5 * 1024 * 1024; // 5MB
export const PROPOSAL_COVER_LETTER_MAX = 4000;
