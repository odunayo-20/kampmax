// ============================================================
// FIND WORK & PROPOSALS TYPES  (Module 23C)
// ============================================================
//
// Backend-authoritative projection of the job/opportunity and proposal
// domain. The frontend collects user input and renders backend state; it
// never sets job/proposal status or ownership client-side.
//
// This is the SINGLE job/opportunity model. Module 27 (Jobs Marketplace)
// generalizes this same model for both employer management and public
// discovery instead of introducing a second job system.

// ── Opportunity (job) status ─────────────────────────────────
// Backend-owned. A freelancer may only apply to OPEN opportunities.
// DRAFT/PENDING_REVIEW are employer/moderation states (Module 27);

export const OPPORTUNITY_STATUS = {
  OPEN: "open",
  CLOSED: "closed",
  EXPIRED: "expired",
  CANCELLED: "cancelled",
  DRAFT: "draft",
  PENDING_REVIEW: "pending_review",
} as const;

export type OpportunityStatus =
  (typeof OPPORTUNITY_STATUS)[keyof typeof OPPORTUNITY_STATUS];

// ── Work arrangement ────────────────────────────────────────

export const OPPORTUNITY_WORK_ARRANGEMENT = {
  REMOTE: "remote",
  ON_SITE: "on_site",
  ON_CAMPUS: "on_campus",
  HYBRID: "hybrid",
} as const;

export type OpportunityWorkArrangement =
  (typeof OPPORTUNITY_WORK_ARRANGEMENT)[keyof typeof OPPORTUNITY_WORK_ARRANGEMENT];

// ── Duration ────────────────────────────────────────────────

export const OPPORTUNITY_DURATION = {
  SHORT_TERM: "short_term",
  FEW_WEEKS: "few_weeks",
  ONE_TO_THREE_MONTHS: "one_to_three_months",
  LONG_TERM: "long_term",
} as const;

export type OpportunityDuration =
  (typeof OPPORTUNITY_DURATION)[keyof typeof OPPORTUNITY_DURATION];

// ── Budget types ────────────────────────────────────────────

export const OPPORTUNITY_BUDGET_TYPE = {
  HOURLY: "hourly",
  PROJECT: "project",
  CONTRACT: "contract",
} as const;

export type OpportunityBudgetType =
  (typeof OPPORTUNITY_BUDGET_TYPE)[keyof typeof OPPORTUNITY_BUDGET_TYPE];

// ── Screening question ──────────────────────────────────────
// Rendered dynamically; answered by id so the backend can trust ids.

export interface OpportunityScreeningQuestion {
  id: string;
  question: string;
  optional: boolean;
}

// ── Attachment ──────────────────────────────────────────────
// Client-relevant metadata only. Never exposes private storage
// credentials or signed download URLs to unauthenticated clients.

export interface OpportunityAttachment {
  id: string;
  filename: string;
  sizeBytes: number;
  mimeType: string;
}

// ── Public employer summary ─────────────────────────────────
// Only fields the backend deems public on a job post. Never email/phone.

export interface OpportunityEmployer {
  id: string;
  name: string;
  descriptor: string;
  location: string;
  verified: boolean;
}

// ── Opportunity (job) ───────────────────────────────────────

export interface Opportunity {
  id: string;
  title: string;
  categoryId: string;
  summary: string;
  description: string;
  requirements: string;
  skills: string[];
  workArrangement: OpportunityWorkArrangement;
  location: {
    city?: string;
    state?: string;
    campusId?: string;
    remote?: boolean;
  };
  budget: {
    type: OpportunityBudgetType;
    min?: number;
    max?: number;
    currency: "NGN";
  };
  duration: OpportunityDuration;
  experienceLevel: string;
  postedAt: string;
  deadline: string;
  status: OpportunityStatus;
  employer: OpportunityEmployer;
  /** Backend-derived owner projection (Module 27). Never client-supplied. */
  employerUserId?: string;
  screeningQuestions: OpportunityScreeningQuestion[];
  attachments: OpportunityAttachment[];
  viewCount: number;
  proposalCount: number;
}

// ── Create/update job input (mass-assignment-safe) ─────────
// Ownership (employerUserId), status, scores, employer summary, postedAt,
// viewCount, proposalCount and screening-question ids are DERIVED by the
// backend/store — they can never be supplied in this shape (no mass assignment).

export interface OpportunityInput {
  title: string;
  categoryId: string;
  summary: string;
  description: string;
  requirements: string;
  skills: string[];
  workArrangement: OpportunityWorkArrangement;
  location: {
    city?: string;
    state?: string;
    campusId?: string;
    remote?: boolean;
  };
  budget: {
    type: OpportunityBudgetType;
    min?: number;
    max?: number;
    currency: "NGN";
  };
  duration: OpportunityDuration;
  experienceLevel: string;
  deadline: string;
  screeningQuestions: OpportunityScreeningQuestion[];
}

// ── Query / pagination ──────────────────────────────────────

export interface OpportunityQuery {
  search?: string;
  categoryId?: string;
  campusId?: string;
  experience?: string;
  arrangement?: OpportunityWorkArrangement;
  budgetType?: OpportunityBudgetType;
  sort?: OpportunitySortKey;
  page?: number;
  size?: number;
}

export type OpportunitySortKey = "newest" | "oldest" | "budget_high" | "budget_low" | "deadline";

export interface OpportunityPage {
  items: Opportunity[];
  total: number;
  page: number;
  size: number;
  totalPages: number;
}

// ── Eligibility (backend-authoritative) ─────────────────────

export const ELIGIBILITY_CODE = {
  ELIGIBLE: "eligible",
  NOT_APPLICABLE: "not_applicable",
  PROFILE_INCOMPLETE: "profile_incomplete",
  VERIFICATION_REQUIRED: "verification_required",
  SKILL_MISMATCH: "skill_mismatch",
  CLOSED: "closed",
  ALREADY_APPLIED: "already_applied",
} as const;

export type EligibilityCode =
  (typeof ELIGIBILITY_CODE)[keyof typeof ELIGIBILITY_CODE];

export interface JobEligibility {
  code: EligibilityCode;
  eligible: boolean;
  reasons: string[];
}

// ── Proposal status (backend-owned) ─────────────────────────

export const PROPOSAL_STATUS = {
  DRAFT: "draft",
  SUBMITTED: "submitted",
  UNDER_REVIEW: "under_review",
  SHORTLISTED: "shortlisted",
  ACCEPTED: "accepted",
  REJECTED: "rejected",
  WITHDRAWN: "withdrawn",
} as const;

export type ProposalStatus =
  (typeof PROPOSAL_STATUS)[keyof typeof PROPOSAL_STATUS];

// ── Delivery estimate ───────────────────────────────────────

export const PROPOSAL_DELIVERY_UNIT = {
  DAYS: "days",
  WEEKS: "weeks",
  MONTHS: "months",
} as const;

export type ProposalDeliveryUnit =
  (typeof PROPOSAL_DELIVERY_UNIT)[keyof typeof PROPOSAL_DELIVERY_UNIT];

// ── Proposal attachment ─────────────────────────────────────

export interface ProposalAttachment {
  id: string;
  filename: string;
  sizeBytes: number;
  mimeType: string;
}

// ── Proposal (owned by the freelancer) ──────────────────────

export interface Proposal {
  id: string;
  opportunityId: string;
  freelancerId: string;
  coverLetter: string;
  proposedAmount?: number;
  delivery: {
    value: number;
    unit: ProposalDeliveryUnit;
  };
  screeningAnswers: {
    questionId: string;
    answer: string;
  }[];
  attachments: ProposalAttachment[];
  status: ProposalStatus;
  createdAt: string;
  updatedAt: string;
  submittedAt?: string;
  /** Optional employer-facing note set when the proposal is rejected (Module 28). */
  rejectionReason?: string;
  timeline: {
    id: string;
    status: ProposalStatus;
    label: string;
    at: string;
  }[];
}

// ── Employer application views (Module 28) ────────────────
// Read-model aggregates the employer Applications & Hiring surface consumes.
// The proposal itself is the application — no duplicate model. The employer
// may only ever see proposals on jobs they own (enforced in the service layer).

export type EmployerApplicationStatus = Exclude<ProposalStatus, "draft">;

/** Evergreen presentation mapping for the statuses an employer can act on. */
export const EMPLOYER_APPLICATION_STATUSES: EmployerApplicationStatus[] = [
  "submitted",
  "under_review",
  "shortlisted",
  "accepted",
  "rejected",
  "withdrawn",
] as const;

/** A proposal + the job it belongs to + a public candidate preview. */
export interface EmployerApplicationSummary {
  proposal: Proposal;
  job: {
    id: string;
    title: string;
    status: OpportunityStatus;
  };
  candidate: {
    id: string;
    name: string;
    headline: string;
    avatar?: string;
  };
}

export interface EmployerApplicationsPage {
  items: EmployerApplicationSummary[];
  total: number;
  page: number;
  size: number;
  totalPages: number;
  /** Per-status counts across the employer's jobs (excludes drafts). */
  counts: Record<EmployerApplicationStatus | "all", number>;
}

// ── Editable proposal input (mass-assignment-safe) ──────────
// Ownership (freelancerId), status and timeline are NEVER in this shape;
// the backend derives them.

export interface ProposalInput {
  opportunityId: string;
  coverLetter: string;
  proposedAmount?: number;
  delivery: {
    value: number;
    unit: ProposalDeliveryUnit;
  };
  screeningAnswers: {
    questionId: string;
    answer: string;
  }[];
  attachments: ProposalAttachment[];
}

// ── Result helper ───────────────────────────────────────────

export const OPPORTUNITY_RESULT = {
  OK: "ok",
  UNAUTHORIZED: "unauthorized",
  NOT_FOUND: "not_found",
  VALIDATION: "validation",
  CONFLICT: "conflict",
} as const;

export type OpportunityResultCode =
  (typeof OPPORTUNITY_RESULT)[keyof typeof OPPORTUNITY_RESULT];

export interface OpportunityResult {
  ok: boolean;
  code: OpportunityResultCode;
  message: string;
  proposal?: Proposal;
  opportunity?: Opportunity;
  status?: ProposalStatus;
  /** Id of the contract created by an accepted proposal (hire). */
  contractId?: string;
}
