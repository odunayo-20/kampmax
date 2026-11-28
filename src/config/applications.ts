// ============================================================
// APPLICATIONS & HIRING CONFIG  (Module 28)
// ============================================================
// Presentation constants for the employer Applications & Hiring surface.
// No business logic — page sizes, debounce, filter/sort options and input
// limits only. Proposal statuses and transitions are backend-authoritative
// (defined in types/opportunity.ts).

import type {
  EmployerApplicationStatus,
  ProposalStatus,
} from "@/types/opportunity";
import { EMPLOYER_APPLICATION_STATUSES, PROPOSAL_STATUS } from "@/types/opportunity";

// ── Pagination & search ─────────────────────────────────────

export const APPLICATIONS_PAGE_SIZE = 10;
export const APPLICATION_SEARCH_DEBOUNCE_MS = 300;

// ── Employer filter tabs (statuses the store exposes) ───────
// Drafts are invisible to employers — a proposal only becomes an
// "application" once submitted.

export const APPLICATION_FILTER_TABS: {
  value: EmployerApplicationStatus | "all";
  label: string;
}[] = [
  { value: "all", label: "All" },
  { value: PROPOSAL_STATUS.SUBMITTED, label: "New" },
  { value: PROPOSAL_STATUS.UNDER_REVIEW, label: "Reviewing" },
  { value: PROPOSAL_STATUS.SHORTLISTED, label: "Shortlisted" },
  { value: PROPOSAL_STATUS.ACCEPTED, label: "Hired" },
  { value: PROPOSAL_STATUS.REJECTED, label: "Rejected" },
  { value: PROPOSAL_STATUS.WITHDRAWN, label: "Withdrawn" },
];

export const EMPLOYER_APPLICATION_VIEWABLE_STATUSES: EmployerApplicationStatus[] = [
  ...EMPLOYER_APPLICATION_STATUSES,
];

// ── Sort options ────────────────────────────────────────────

export type EmployerApplicationSortKey =
  | "newest"
  | "oldest"
  | "amount_high"
  | "amount_low"
  | "delivery_fast";

export const APPLICATION_SORT_OPTIONS: {
  value: EmployerApplicationSortKey;
  label: string;
}[] = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "amount_high", label: "Quote: High to low" },
  { value: "amount_low", label: "Quote: Low to high" },
  { value: "delivery_fast", label: "Fastest delivery" },
];

// ── Input limits (mirror backend DTO validation) ────────────

export const APPLICATION_REJECT_REASON_MAX = 500;

// ── Statuses a proposal must be in before an employer can act ──

export const APPLICATION_REVIEWABLE_FROM: ProposalStatus[] = [
  PROPOSAL_STATUS.SUBMITTED,
];

export const APPLICATION_SHORTLISTABLE_FROM: ProposalStatus[] = [
  PROPOSAL_STATUS.SUBMITTED,
  PROPOSAL_STATUS.UNDER_REVIEW,
];

export const APPLICATION_REJECTABLE_FROM: ProposalStatus[] = [
  PROPOSAL_STATUS.SUBMITTED,
  PROPOSAL_STATUS.UNDER_REVIEW,
  PROPOSAL_STATUS.SHORTLISTED,
];

export const APPLICATION_ACCEPTABLE_FROM: ProposalStatus[] = [
  PROPOSAL_STATUS.SUBMITTED,
  PROPOSAL_STATUS.UNDER_REVIEW,
  PROPOSAL_STATUS.SHORTLISTED,
];
/**
 * The lowest price among proposals still open to a decision, when there are at least two to compare; null otherwise.
 * The mobile app's freelance-ux lowestAmount says the same.
 */
export function lowestOpenAmount(items: { status: ProposalStatus; proposedAmount?: number }[]): number | null {
  const open = items.filter((p) => APPLICATION_REJECTABLE_FROM.includes(p.status) && p.proposedAmount !== undefined).map((p) => p.proposedAmount as number);
  return open.length > 1 ? Math.min(...open) : null;
}
