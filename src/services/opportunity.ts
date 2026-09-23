// ============================================================
// FIND WORK & PROPOSALS SERVICE  (Module 23C)
// ============================================================
//
// Owner-scoped facade over the opportunity/proposal store. Mirrors the
// future NestJS API. SECURITY:
//   - Proposal ownership is ALWAYS derived from getCurrentUser().id
//     (IDOR/BOLA-safe) — the client never supplies freelancerId/ownerId.
//   - Proposal/job status is backend-owned: only store transitions write it.
//   - Eligibility is computed by the store's backend logic, never trusted
//     from the browser; frontend code only displays the result.
//   - Validation mirrors backend DTOs (cover letter length, amounts,
//     delivery, attachments, safe URLs).
//   - No fake data: unauthenticated or missing profiles return real
//     error/eligibility results, never invented records.

import { getCurrentUser, getUserById } from "@/services/users";
import { apiClient } from "@/lib/api-client";
import type { ApiError } from "@/lib/api-client";
import {
  closeOpportunityRecord,
  countEmployerApplicationStatuses,
  countOpportunitiesByStatus,
  createOpportunityRecord,
  ensureProposalRecord,
  getAllOpportunities,
  getOpportunityRecord,
  getProposalById,
  getProposalForOpportunity,
  getProposalsByFreelancer,
  getProposalsForOpportunities,
  getProposalsForOpportunity,
  getSavedOpportunityIds,
  incrementOpportunityViews,
  listEmployerOpportunityRecords,
  publishOpportunityRecord,
  queryOpportunityRecords,
  saveOpportunityRecord,
  setProposalAcceptedRecord,
  setProposalRejectedRecord,
  setProposalShortlistedRecord,
  setProposalUnderReviewRecord,
  sortOpportunities,
  submitProposalRecord,
  unsaveOpportunityRecord,
  updateDraftOpportunityRecord,
  updateProposalDraftRecord,
  withdrawProposalRecord,
} from "@/data/opportunity";
import { getFreelancerOnboardingDraft } from "@/data/freelancer";
import { getEmployerOnboardingDraft } from "@/data/employer";
import { createContractRecord } from "@/data/contracts";
import { getEmployerDashboardAccess, getEmployerPublicPreview } from "@/services/employer";
import { getPublicFreelancerProfile } from "@/services/freelancer-dashboard";
import { pushUserNotification } from "@/services/notifications";
import { getCampusById } from "@/services/campus";
import type {
  EmployerApplicationStatus,
  EmployerApplicationsPage,
  EmployerApplicationSummary,
  JobEligibility,
  Opportunity,
  OpportunityEmployer,
  OpportunityInput,
  OpportunityPage,
  OpportunityQuery,
  OpportunityResult,
  OpportunityResultCode,
  OpportunitySortKey,
  OpportunityStatus,
  OpportunityWorkArrangement,
  Proposal,
  ProposalInput,
  ProposalStatus,
} from "@/types/opportunity";
import {
  ELIGIBILITY_CODE,
  OPPORTUNITY_BUDGET_TYPE,
  OPPORTUNITY_DURATION,
  OPPORTUNITY_RESULT,
  OPPORTUNITY_STATUS,
  OPPORTUNITY_WORK_ARRANGEMENT,
  PROPOSAL_STATUS,
} from "@/types/opportunity";
import {
  JOB_EXPERIENCE_LEVELS,
  OPPORTUNITY_SAFE_SCHEMES,
  PROPOSAL_COVER_LETTER_MAX,
  JOB_CATEGORIES,
} from "@/config/opportunity";
import {
  APPLICATION_REJECT_REASON_MAX,
  APPLICATIONS_PAGE_SIZE,
  type EmployerApplicationSortKey,
} from "@/config/applications";
import {
  EMPLOYER_JOBS_PAGE_SIZE,
  JOB_DESCRIPTION_MAX_CHARS,
  JOB_QUESTION_MAX_CHARS,
  JOB_REQUIREMENTS_MAX_CHARS,
  JOB_SCREENING_QUESTIONS_MAX,
  JOB_SKILL_MAX_COUNT,
  JOB_SUMMARY_MAX_CHARS,
  JOB_TITLE_MAX_CHARS,
} from "@/config/jobs";

// ── Owner context ───────────────────────────────────────────

function currentUserId(): string | null {
  const user = getCurrentUser();
  return user?.id ?? null;
}

function ok(message: string, extra?: Partial<OpportunityResult>): OpportunityResult {
  return { ok: true, code: OPPORTUNITY_RESULT.OK, message, ...extra };
}

function fail(code: OpportunityResultCode, message: string): OpportunityResult {
  return { ok: false, code, message };
}

function isSafeExternalUrl(value: string | undefined | null): boolean {
  if (!value) return true;
  try {
    const url = new URL(value, "https://kampmax.ng");
    return OPPORTUNITY_SAFE_SCHEMES.includes(
      url.protocol as (typeof OPPORTUNITY_SAFE_SCHEMES)[number]
    );
  } catch {
    return false;
  }
}

// ── Public discovery ────────────────────────────────────────
// Freelancers may only see OPEN opportunities (backend-owned visibility).

const DISCOVERABLE_STATUSES: OpportunityStatus[] = [OPPORTUNITY_STATUS.OPEN];

export function getOpportunitiesPage(query: OpportunityQuery = {}): OpportunityPage {
  const size = Math.min(Math.max(query.size ?? 9, 1), 30);
  const page = Math.max(query.page ?? 1, 1);
  const { items, total } = queryOpportunityRecords(query, DISCOVERABLE_STATUSES);
  const totalPages = Math.max(1, Math.ceil(total / size));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * size;
  return {
    items: items.slice(start, start + size),
    total,
    page: safePage,
    size,
    totalPages,
  };
}

/** Public job detail (only discoverable statuses). Returns null if not visible. */
export function getDiscoverableOpportunity(id: string): Opportunity | null {
  const opp = getOpportunityRecord(id);
  if (!opp || !DISCOVERABLE_STATUSES.includes(opp.status)) return null;
  return opp;
}

/** Full job record regardless of visibility status — for detail/eligibility. */
export function getOpportunity(id: string): Opportunity | null {
  return getOpportunityRecord(id);
}

export function recordOpportunityView(id: string): void {
  incrementOpportunityViews(id);
}

export function categoryLabelFor(categoryId: string): string {
  return JOB_CATEGORIES.find((c) => c.id === categoryId)?.name ?? "Other";
}

export function campusNameFor(campusId?: string): string | undefined {
  if (!campusId) return undefined;
  return getCampusById(campusId)?.name;
}

// ── Saved jobs (owner-scoped) ───────────────────────────────

export function isJobSavedForUser(jobId: string): boolean {
  const uid = currentUserId();
  if (!uid) return false;
  return getSavedOpportunityIds(uid).includes(jobId);
}

export function getSavedJobsForUser(): Opportunity[] {
  const uid = currentUserId();
  if (!uid) return [];
  const ids = getSavedOpportunityIds(uid);
  return ids
    .map((id) => getOpportunityRecord(id))
    .filter((o): o is Opportunity => !!o);
}

export function saveJobForUser(jobId: string): OpportunityResult {
  const uid = currentUserId();
  if (!uid) return fail(OPPORTUNITY_RESULT.UNAUTHORIZED, "Not authenticated.");
  const opp = getOpportunityRecord(jobId);
  if (!opp) return fail(OPPORTUNITY_RESULT.NOT_FOUND, "Opportunity not found.");
  saveOpportunityRecord(uid, jobId);
  return ok("Job saved.");
}

export function unsaveJobForUser(jobId: string): OpportunityResult {
  const uid = currentUserId();
  if (!uid) return fail(OPPORTUNITY_RESULT.UNAUTHORIZED, "Not authenticated.");
  unsaveOpportunityRecord(uid, jobId);
  return ok("Job removed from saved.");
}

// ── Employer job management (Module 27) ─────────────────────
// Owner-scoped. Ownership is ALWAYS derived from the authenticated user;
// the client can never pass an employerUserId. Status transitions are the
// only writes to status and are enforced by the store.

export interface EmployerJobsQuery {
  status?: OpportunityStatus | "all";
  sort?: OpportunitySortKey;
  page?: number;
  size?: number;
}

function emptyJobPage(size: number): OpportunityPage {
  return { items: [], total: 0, page: 1, size, totalPages: 1 };
}

/** Employer-scoped job list across spine statuses (moderation-aware). */
export function getEmployerJobsPage(query: EmployerJobsQuery = {}): OpportunityPage {
  const uid = currentUserId();
  const size = Math.min(Math.max(query.size ?? EMPLOYER_JOBS_PAGE_SIZE, 1), 30);
  const page = Math.max(query.page ?? 1, 1);
  if (!uid) return emptyJobPage(size);

  let items = listEmployerOpportunityRecords(uid);
  if (query.status && query.status !== "all") {
    items = items.filter((o) => o.status === query.status);
  }
  items = sortOpportunities(items, query.sort ?? "newest");

  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / size));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * size;
  return {
    items: items.slice(start, start + size),
    total,
    page: safePage,
    size,
    totalPages,
  };
}

/** Ownership-scoped single job in any spine status. Null for non-owners. */
export function getEmployerJob(id: string): Opportunity | null {
  const uid = currentUserId();
  if (!uid) return null;
  const opp = getOpportunityRecord(id);
  if (!opp || opp.employerUserId !== uid) return null;
  return opp;
}

/** Per-status counts for the employer's job filter tabs. */
export function getEmployerJobsSummary(): Record<OpportunityStatus, number> & { all: number } {
  const uid = currentUserId();
  if (!uid) {
    return { draft: 0, pending_review: 0, open: 0, closed: 0, expired: 0, cancelled: 0, all: 0 };
  }
  return countOpportunitiesByStatus(uid);
}

function toOpportunityEmployer(uid: string, preview: NonNullable<ReturnType<typeof getEmployerPublicPreview>>): OpportunityEmployer {
  return {
    id: uid,
    name: preview.name,
    descriptor: preview.descriptor,
    location: preview.location,
    verified: preview.verified,
  };
}

/** Creates a DRAFT job owned by the authenticated, approved employer. */
export function createJobForEmployer(input: OpportunityInput): OpportunityResult {
  const uid = currentUserId();
  if (!uid) return fail(OPPORTUNITY_RESULT.UNAUTHORIZED, "Not authenticated.");
  const access = getEmployerDashboardAccess();
  if (!access.canUseDashboard) {
    return fail(OPPORTUNITY_RESULT.UNAUTHORIZED, "Your employer profile must be approved before you can post jobs.");
  }
  const draft = getEmployerOnboardingDraft(uid);
  const preview = getEmployerPublicPreview(draft);
  if (!draft || !preview) {
    return fail(OPPORTUNITY_RESULT.UNAUTHORIZED, "Your employer profile isn't ready to post jobs yet.");
  }
  const issues = validateJobInput(input);
  if (issues) return issues;
  const opportunity = createOpportunityRecord(uid, input, toOpportunityEmployer(uid, preview));
  return ok("Job draft saved.", { opportunity });
}

/** Updates a DRAFT job owned by the authenticated employer. */
export function updateJobForEmployer(id: string, input: OpportunityInput): OpportunityResult {
  const uid = currentUserId();
  if (!uid) return fail(OPPORTUNITY_RESULT.UNAUTHORIZED, "Not authenticated.");
  const existing = getOpportunityRecord(id);
  if (!existing || existing.employerUserId !== uid) {
    return fail(OPPORTUNITY_RESULT.NOT_FOUND, "Job not found.");
  }
  if (existing.status !== OPPORTUNITY_STATUS.DRAFT) {
    return fail(OPPORTUNITY_RESULT.CONFLICT, "Only draft jobs can be edited.");
  }
  const issues = validateJobInput(input);
  if (issues) return issues;
  const updated = updateDraftOpportunityRecord(uid, id, input);
  if (!updated) return fail(OPPORTUNITY_RESULT.CONFLICT, "This job can no longer be edited.");
  return ok("Draft saved.", { opportunity: updated });
}

/** DRAFT → PENDING_REVIEW. Backend-owned transition; moderation is Module 32. */
export function publishJobForEmployer(id: string): OpportunityResult {
  const uid = currentUserId();
  if (!uid) return fail(OPPORTUNITY_RESULT.UNAUTHORIZED, "Not authenticated.");
  const access = getEmployerDashboardAccess();
  if (!access.canUseDashboard) {
    return fail(OPPORTUNITY_RESULT.UNAUTHORIZED, "Your employer profile must be approved before you can publish jobs.");
  }
  const opp = getOpportunityRecord(id);
  if (!opp || opp.employerUserId !== uid) {
    return fail(OPPORTUNITY_RESULT.NOT_FOUND, "Job not found.");
  }
  const published = publishOpportunityRecord(uid, id);
  if (!published) {
    return fail(OPPORTUNITY_RESULT.CONFLICT, "Only draft jobs can be submitted for review.");
  }
  pushUserNotification({
    userId: uid,
    type: "marketplace",
    category: "marketplace",
    title: "Job submitted for review",
    message: `"${published.title}" is now awaiting moderation before it goes live.`,
    actionUrl: "/employer/jobs",
  });
  return ok("Job submitted for review.", { opportunity: published });
}

/** OPEN → CLOSED. Owner retracts a live posting. */
export function closeJobForEmployer(id: string): OpportunityResult {
  const uid = currentUserId();
  if (!uid) return fail(OPPORTUNITY_RESULT.UNAUTHORIZED, "Not authenticated.");
  const access = getEmployerDashboardAccess();
  if (!access.canUseDashboard) {
    return fail(OPPORTUNITY_RESULT.UNAUTHORIZED, "Your employer profile must be approved before you can manage jobs.");
  }
  const opp = getOpportunityRecord(id);
  if (!opp || opp.employerUserId !== uid) {
    return fail(OPPORTUNITY_RESULT.NOT_FOUND, "Job not found.");
  }
  const closed = closeOpportunityRecord(uid, id);
  if (!closed) {
    return fail(OPPORTUNITY_RESULT.CONFLICT, "Only open jobs can be closed.");
  }
  pushUserNotification({
    userId: uid,
    type: "marketplace",
    category: "marketplace",
    title: "Job closed",
    message: `"${closed.title}" is no longer accepting proposals.`,
    actionUrl: "/employer/jobs",
  });
  return ok("Job closed.", { opportunity: closed });
}

// ── Employer Applications & Hiring (Module 28) ──────────────
// The employer faces the SAME Proposal records freelancers submit — no
// duplicate application model. Every read/mutation is owner-scoped:
//   - only proposals on the authenticated employer's own jobs are returned
//     (NOT_FOUND on anything else — existence is never leaked);
//   - status CLIENT transitions are backend-owned (store writes only);
//   - details only surface an approved candidate's public profile, never
//     contact info or private documents.

export interface EmployerApplicationsQuery {
  jobId?: string;
  status?: EmployerApplicationStatus | "all";
  sort?: EmployerApplicationSortKey;
  search?: string;
  page?: number;
  size?: number;
}

const ZERO_APP_COUNTS: Record<EmployerApplicationStatus | "all", number> = {
  submitted: 0,
  under_review: 0,
  shortlisted: 0,
  accepted: 0,
  rejected: 0,
  withdrawn: 0,
  all: 0,
};

function emptyApplicationsPage(size: number): EmployerApplicationsPage {
  return { items: [], total: 0, page: 1, size, totalPages: 1, counts: { ...ZERO_APP_COUNTS } };
}

function employerOwnedJobIds(uid: string): string[] {
  return listEmployerOpportunityRecords(uid).map((o) => o.id);
}

function toApplicationSummary(p: Proposal): EmployerApplicationSummary | null {
  const job = getOpportunityRecord(p.opportunityId);
  if (!job) return null;
  const user = getUserById(p.freelancerId);
  const profile = getPublicFreelancerProfile(p.freelancerId);
  return {
    proposal: p,
    job: { id: job.id, title: job.title, status: job.status },
    candidate: {
      id: p.freelancerId,
      name: user?.name ?? p.freelancerId,
      headline: profile?.headline ?? "",
      avatar: user?.avatar || undefined,
    },
  };
}

function sortApplications(
  proposals: Proposal[],
  sort: EmployerApplicationSortKey
): Proposal[] {
  const amount = (p: Proposal) => p.proposedAmount ?? 0;
  const byUpdated = (a: Proposal, b: Proposal) =>
    +new Date(b.updatedAt) - +new Date(a.updatedAt);
  switch (sort) {
    case "oldest":
      return [...proposals].sort(
        (a, b) => +new Date(a.updatedAt) - +new Date(b.updatedAt)
      );
    case "amount_high":
      return [...proposals].sort((a, b) => amount(b) - amount(a) || byUpdated(a, b));
    case "amount_low":
      return [...proposals].sort((a, b) => amount(a) - amount(b) || byUpdated(a, b));
    case "delivery_fast":
      return [...proposals].sort(
        (a, b) => a.delivery.value - b.delivery.value || byUpdated(a, b)
      );
    case "newest":
    default:
      return [...proposals].sort(byUpdated);
  }
}

/** Returns the proposal if it belongs to one of the employer's own jobs. */
function ownedApplication(id: string): Proposal | null {
  const uid = currentUserId();
  if (!uid) return null;
  const p = getProposalById(id);
  if (!p || p.status === PROPOSAL_STATUS.DRAFT) return null;
  const job = getOpportunityRecord(p.opportunityId);
  if (!job || job.employerUserId !== uid) return null;
  return p;
}

function jobTitleFor(proposalId: string): string {
  const p = getProposalById(proposalId);
  const job = p ? getOpportunityRecord(p.opportunityId) : null;
  return job?.title ?? "the job";
}

/**
 * Paginated, employer-scoped application list. Drafts are excluded (a
 * proposal only becomes an "application" once submitted). Search runs across
 * candidate name, headline and cover letter; filter/sort/pagination all act
 * server-side here in the store layer.
 */
export function getEmployerApplicationsPage(
  query: EmployerApplicationsQuery = {}
): EmployerApplicationsPage {
  const uid = currentUserId();
  const size = Math.min(Math.max(query.size ?? APPLICATIONS_PAGE_SIZE, 1), 30);
  const page = Math.max(query.page ?? 1, 1);
  if (!uid) return emptyApplicationsPage(size);

  let oppIds = employerOwnedJobIds(uid);
  if (query.jobId) {
    const job = getOpportunityRecord(query.jobId);
    if (!job || job.employerUserId !== uid) return emptyApplicationsPage(size);
    oppIds = [query.jobId];
  }

  const counts = countEmployerApplicationStatuses(oppIds);
  let items = getProposalsForOpportunities(oppIds);

  if (query.status && query.status !== "all") {
    items = items.filter((p) => p.status === query.status);
  }

  const search = query.search?.trim().toLowerCase();
  if (search) {
    items = items.filter((p) => {
      const user = getUserById(p.freelancerId);
      const profile = getPublicFreelancerProfile(p.freelancerId);
      const name = user?.name?.toLowerCase() ?? "";
      const headline = profile?.headline?.toLowerCase() ?? "";
      return (
        name.includes(search) ||
        headline.includes(search) ||
        p.coverLetter.toLowerCase().includes(search)
      );
    });
  }

  items = sortApplications(items, query.sort ?? "newest");
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / size));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * size;
  const summaries = items
    .slice(start, start + size)
    .map(toApplicationSummary)
    .filter((s): s is EmployerApplicationSummary => s !== null);

  return {
    items: summaries,
    total,
    page: safePage,
    size,
    totalPages,
    counts,
  };
}

/** Per-status counts for the employer's application filter tabs. */
export function getEmployerApplicationsSummary(): Record<
  EmployerApplicationStatus | "all",
  number
> {
  const uid = currentUserId();
  if (!uid) return { ...ZERO_APP_COUNTS };
  return countEmployerApplicationStatuses(employerOwnedJobIds(uid));
}

/**
 * Owner-scoped single application. Non-existent proposals and proposals on
 * other employers' jobs are indistinguishable (NOT_FOUND at the query layer)
 * so the route never reveals the existence of other jobs' candidates.
 */
export function getEmployerApplication(
  id: string
): EmployerApplicationSummary | null {
  const owned = ownedApplication(id);
  if (!owned) return null;
  return toApplicationSummary(owned);
}

/** SUBMITTED → UNDER_REVIEW */
export function reviewApplication(id: string): OpportunityResult {
  const uid = currentUserId();
  if (!uid) return fail(OPPORTUNITY_RESULT.UNAUTHORIZED, "Not authenticated.");
  const existing = ownedApplication(id);
  if (!existing) return fail(OPPORTUNITY_RESULT.NOT_FOUND, "Application not found.");
  const updated = setProposalUnderReviewRecord(id);
  if (!updated) {
    return fail(OPPORTUNITY_RESULT.CONFLICT, "Only new applications can be moved to reviewing.");
  }
  pushUserNotification({
    userId: existing.freelancerId,
    type: "marketplace",
    category: "marketplace",
    title: "Application under review",
    message: `The client is now reviewing your application for "${jobTitleFor(id)}".`,
    actionUrl: `/freelancer/proposals/${id}`,
  });
  return ok("Application moved to reviewing.", {
    proposal: updated,
    status: PROPOSAL_STATUS.UNDER_REVIEW,
  });
}

/** SUBMITTED | UNDER_REVIEW → SHORTLISTED */
export function shortlistApplication(id: string): OpportunityResult {
  const uid = currentUserId();
  if (!uid) return fail(OPPORTUNITY_RESULT.UNAUTHORIZED, "Not authenticated.");
  const existing = ownedApplication(id);
  if (!existing) return fail(OPPORTUNITY_RESULT.NOT_FOUND, "Application not found.");
  const updated = setProposalShortlistedRecord(id);
  if (!updated) {
    return fail(OPPORTUNITY_RESULT.CONFLICT, "This application can no longer be shortlisted.");
  }
  pushUserNotification({
    userId: existing.freelancerId,
    type: "marketplace",
    category: "marketplace",
    title: "You've been shortlisted",
    message: `You've been shortlisted for "${jobTitleFor(id)}".`,
    actionUrl: `/freelancer/proposals/${id}`,
  });
  return ok("Application shortlisted.", {
    proposal: updated,
    status: PROPOSAL_STATUS.SHORTLISTED,
  });
}

/** SUBMITTED | UNDER_REVIEW | SHORTLISTED → REJECTED (optional reason) */
export function rejectApplication(id: string, reason?: string): OpportunityResult {
  const uid = currentUserId();
  if (!uid) return fail(OPPORTUNITY_RESULT.UNAUTHORIZED, "Not authenticated.");
  const existing = ownedApplication(id);
  if (!existing) return fail(OPPORTUNITY_RESULT.NOT_FOUND, "Application not found.");
  if (reason !== undefined && reason.trim().length > APPLICATION_REJECT_REASON_MAX) {
    return fail(
      OPPORTUNITY_RESULT.VALIDATION,
      `Feedback must be ${APPLICATION_REJECT_REASON_MAX} characters or fewer.`
    );
  }
  const updated = setProposalRejectedRecord(id, reason);
  if (!updated) {
    return fail(OPPORTUNITY_RESULT.CONFLICT, "This application can no longer be rejected.");
  }
  pushUserNotification({
    userId: existing.freelancerId,
    type: "marketplace",
    category: "marketplace",
    title: "Application update",
    message: `Your application for "${jobTitleFor(id)}" was not selected.`,
    actionUrl: `/freelancer/proposals/${id}`,
  });
  return ok("Application rejected.", {
    proposal: updated,
    status: PROPOSAL_STATUS.REJECTED,
  });
}

/**
 * Hire: SUBMITTED | UNDER_REVIEW | SHORTLISTED → ACCEPTED. One backend-owned
 * action that (a) marks the proposal accepted, (b) closes the job if it is
 * still OPEN, and (c) creates the PENDING_ACCEPTANCE contract owned by the
 * freelancer. The client edge NEVER constructs the contract itself.
 */
export function acceptApplication(id: string): OpportunityResult {
  const uid = currentUserId();
  if (!uid) return fail(OPPORTUNITY_RESULT.UNAUTHORIZED, "Not authenticated.");
  const existing = ownedApplication(id);
  if (!existing) return fail(OPPORTUNITY_RESULT.NOT_FOUND, "Application not found.");
  const job = getOpportunityRecord(existing.opportunityId);
  if (!job) return fail(OPPORTUNITY_RESULT.NOT_FOUND, "Application not found.");

  const accepted = setProposalAcceptedRecord(id);
  if (!accepted) {
    return fail(OPPORTUNITY_RESULT.CONFLICT, "Only reviewing or shortlisted applications can be hired.");
  }

  if (job.status === OPPORTUNITY_STATUS.OPEN) {
    closeOpportunityRecord(uid, job.id);
  }

  const deadlineMultiplier =
    existing.delivery.unit === "days" ? 1 : existing.delivery.unit === "weeks" ? 7 : 30;
  const contract = createContractRecord({
    freelancerId: existing.freelancerId,
    proposalId: existing.id,
    projectTitle: job.title,
    client: {
      id: job.employer.id,
      displayName: job.employer.name,
      organization: job.employer.name,
      verified: job.employer.verified,
    },
    agreedAmount: existing.proposedAmount,
    scope: job.description,
    deliverables: job.requirements
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .slice(0, 8),
    deadlineDays: existing.delivery.value * deadlineMultiplier,
  });

  pushUserNotification({
    userId: existing.freelancerId,
    type: "marketplace",
    category: "marketplace",
    title: "Your application was accepted",
    message: `Congratulations! Your application for "${job.title}" was accepted. A contract is waiting for your review.`,
    actionUrl: `/freelancer/contracts/${contract.id}`,
  });

  return ok("Application accepted — a contract was created.", {
    proposal: accepted,
    status: PROPOSAL_STATUS.ACCEPTED,
    contractId: contract.id,
  });
}

// ── Eligibility (backend-computed; display only) ────────────

export function getJobEligibility(jobId: string): JobEligibility {
  const uid = currentUserId();
  const opp = getOpportunityRecord(jobId);

  if (!opp) {
    return {
      code: ELIGIBILITY_CODE.NOT_APPLICABLE,
      eligible: false,
      reasons: ["This opportunity could not be found."],
    };
  }

  if (opp.status !== OPPORTUNITY_STATUS.OPEN) {
    return {
      code: ELIGIBILITY_CODE.CLOSED,
      eligible: false,
      reasons: ["This opportunity is no longer accepting proposals."],
    };
  }

  if (!uid) {
    return {
      code: ELIGIBILITY_CODE.VERIFICATION_REQUIRED,
      eligible: false,
      reasons: ["You must be signed in as an approved freelancer to apply."],
    };
  }

  const draft = getFreelancerOnboardingDraft(uid);
  if (!draft || draft.status !== "APPROVED") {
    return {
      code: ELIGIBILITY_CODE.PROFILE_INCOMPLETE,
      eligible: false,
      reasons: ["Complete and submit your freelancer profile before applying."],
    };
  }

  const existing = getProposalForOpportunity(uid, jobId);
  if (existing && existing.status !== PROPOSAL_STATUS.WITHDRAWN) {
    return {
      code: ELIGIBILITY_CODE.ALREADY_APPLIED,
      eligible: false,
      reasons: ["You've already submitted a proposal for this opportunity."],
    };
  }

  const mySkills = (draft.skills ?? []).map((s) => s.toLowerCase());
  const missing = (opp.skills ?? []).filter(
    (s) => !mySkills.includes(s.toLowerCase())
  );
  if (missing.length > 0) {
    return {
      code: ELIGIBILITY_CODE.SKILL_MISMATCH,
      eligible: false,
      reasons: [
        "Your profile doesn't currently list every required skill for this opportunity.",
        `Missing from your profile: ${missing.join(", ")}.`,
      ],
    };
  }

  return {
    code: ELIGIBILITY_CODE.ELIGIBLE,
    eligible: true,
    reasons: ["You're eligible to apply for this opportunity."],
  };
}

// ── Proposal lifecycle (owner-scoped, backend-owned status) ─

export function createProposalDraft(input: ProposalInput): OpportunityResult {
  const uid = currentUserId();
  if (!uid) return fail(OPPORTUNITY_RESULT.UNAUTHORIZED, "Not authenticated.");
  const issues = validateProposalInput(input);
  if (issues) return issues;
  const { proposal } = ensureProposalRecord(uid, input);
  return ok("Draft saved.", { proposal });
}

export function saveProposalDraft(id: string, input: ProposalInput): OpportunityResult {
  const uid = currentUserId();
  if (!uid) return fail(OPPORTUNITY_RESULT.UNAUTHORIZED, "Not authenticated.");
  const existing = getProposalById(id);
  if (!existing || existing.freelancerId !== uid) {
    return fail(OPPORTUNITY_RESULT.NOT_FOUND, "Proposal not found.");
  }
  if (existing.status !== PROPOSAL_STATUS.DRAFT) {
    return fail(OPPORTUNITY_RESULT.CONFLICT, "Only draft proposals can be edited.");
  }
  const issues = validateProposalInput(input);
  if (issues) return issues;
  const updated = updateProposalDraftRecord(id, input);
  if (!updated) return fail(OPPORTUNITY_RESULT.CONFLICT, "This proposal can no longer be edited.");
  return ok("Draft saved.", { proposal: updated });
}

export function getProposal(id: string): Proposal | null {
  const uid = currentUserId();
  if (!uid) return null;
  const p = getProposalById(id);
  if (!p || p.freelancerId !== uid) return null;
  return p;
}

export function getMyProposals(): Proposal[] {
  const uid = currentUserId();
  if (!uid) return [];
  return getProposalsByFreelancer(uid);
}

export function submitProposal(id: string): OpportunityResult {
  const uid = currentUserId();
  if (!uid) return fail(OPPORTUNITY_RESULT.UNAUTHORIZED, "Not authenticated.");
  const existing = getProposalById(id);
  if (!existing || existing.freelancerId !== uid) {
    return fail(OPPORTUNITY_RESULT.NOT_FOUND, "Proposal not found.");
  }
  if (existing.status !== PROPOSAL_STATUS.DRAFT) {
    return fail(OPPORTUNITY_RESULT.CONFLICT, "This proposal can no longer be submitted.");
  }
  const opp = getOpportunityRecord(existing.opportunityId);
  if (!opp || opp.status !== OPPORTUNITY_STATUS.OPEN) {
    return fail(OPPORTUNITY_RESULT.CONFLICT, "This opportunity is no longer accepting proposals.");
  }
  const submitted = submitProposalRecord(id);
  if (!submitted) return fail(OPPORTUNITY_RESULT.CONFLICT, "This proposal can no longer be submitted.");
  pushUserNotification({
    userId: uid,
    type: "marketplace",
    category: "marketplace",
    title: "Proposal submitted",
    message: `Your proposal for "${opp.title}" has been sent to the client.`,
    actionUrl: "/freelancer/proposals",
  });
  return ok("Proposal submitted.", { proposal: submitted, status: PROPOSAL_STATUS.SUBMITTED });
}

export function withdrawProposal(id: string): OpportunityResult {
  const uid = currentUserId();
  if (!uid) return fail(OPPORTUNITY_RESULT.UNAUTHORIZED, "Not authenticated.");
  const existing = getProposalById(id);
  if (!existing || existing.freelancerId !== uid) {
    return fail(OPPORTUNITY_RESULT.NOT_FOUND, "Proposal not found.");
  }
  const withdrawn = withdrawProposalRecord(id);
  if (!withdrawn) {
    return fail(OPPORTUNITY_RESULT.CONFLICT, "This proposal can no longer be withdrawn.");
  }
  return ok("Proposal withdrawn.", { proposal: withdrawn, status: PROPOSAL_STATUS.WITHDRAWN });
}

// ── Validation (mirrors backend DTO validation) ─────────────

function validateProposalInput(input: ProposalInput): OpportunityResult | null {
  if (!input.opportunityId) {
    return fail(OPPORTUNITY_RESULT.VALIDATION, "A job is required.");
  }
  if (!input.coverLetter.trim()) {
    return fail(OPPORTUNITY_RESULT.VALIDATION, "A cover letter is required.");
  }
  if (input.coverLetter.trim().length > PROPOSAL_COVER_LETTER_MAX) {
    return fail(OPPORTUNITY_RESULT.VALIDATION, `Cover letter must be ${PROPOSAL_COVER_LETTER_MAX} characters or fewer.`);
  }
  if (input.proposedAmount !== undefined) {
    if (!Number.isFinite(input.proposedAmount) || input.proposedAmount < 0) {
      return fail(OPPORTUNITY_RESULT.VALIDATION, "Proposed amount must be a positive number.");
    }
  }
  if (
    !input.delivery ||
    !Number.isFinite(input.delivery.value) ||
    input.delivery.value <= 0 ||
    !["days", "weeks", "months"].includes(input.delivery.unit)
  ) {
    return fail(OPPORTUNITY_RESULT.VALIDATION, "A valid delivery estimate is required.");
  }
  if (input.attachments.some((a) => a.sizeBytes > 5 * 1024 * 1024)) {
    return fail(OPPORTUNITY_RESULT.VALIDATION, "Each attachment must be 5MB or smaller.");
  }
  return null;
}

/**
 * Job create/update validation (mirrors backend DTOs). Run on save-draft,
 * create and publish so the strictly-typed store only ever holds valid data.
 * Mass-assignment safe: ownership, status, summary and scores are derived,
 * never validated from client input.
 */
export function validateJobInput(input: OpportunityInput): OpportunityResult | null {
  const failVal = (message: string) => fail(OPPORTUNITY_RESULT.VALIDATION, message);

  if (!input.title?.trim()) return failVal("A job title is required.");
  if (input.title.trim().length > JOB_TITLE_MAX_CHARS) {
    return failVal(`Job title must be ${JOB_TITLE_MAX_CHARS} characters or fewer.`);
  }
  if (!input.categoryId || !JOB_CATEGORIES.some((c) => c.id === input.categoryId)) {
    return failVal("Choose a valid job category.");
  }
  if (!input.summary?.trim()) return failVal("A short summary is required.");
  if (input.summary.trim().length > JOB_SUMMARY_MAX_CHARS) {
    return failVal(`Summary must be ${JOB_SUMMARY_MAX_CHARS} characters or fewer.`);
  }
  if (!input.description?.trim()) return failVal("A full description is required.");
  if (input.description.trim().length > JOB_DESCRIPTION_MAX_CHARS) {
    return failVal(`Description must be ${JOB_DESCRIPTION_MAX_CHARS} characters or fewer.`);
  }
  if (!input.requirements?.trim()) return failVal("Job requirements are required.");
  if (input.requirements.trim().length > JOB_REQUIREMENTS_MAX_CHARS) {
    return failVal(`Requirements must be ${JOB_REQUIREMENTS_MAX_CHARS} characters or fewer.`);
  }
  const skills = (input.skills ?? []).map((s) => s.trim()).filter(Boolean);
  if (skills.length === 0) return failVal("Add at least one skill.");
  if (skills.length > JOB_SKILL_MAX_COUNT) {
    return failVal(`Jobs can have at most ${JOB_SKILL_MAX_COUNT} skills.`);
  }
  if (!Object.values(OPPORTUNITY_WORK_ARRANGEMENT).includes(input.workArrangement)) {
    return failVal("Choose a valid work arrangement.");
  }
  if (!Object.values(OPPORTUNITY_BUDGET_TYPE).includes(input.budget.type)) {
    return failVal("Choose a valid budget type.");
  }
  const min = input.budget.min;
  const max = input.budget.max;
  if (min !== undefined && (!Number.isFinite(min) || min < 0)) {
    return failVal("Minimum budget must be a positive number.");
  }
  if (max !== undefined && (!Number.isFinite(max) || max < 0)) {
    return failVal("Maximum budget must be a positive number.");
  }
  if (min !== undefined && max !== undefined && max < min) {
    return failVal("Maximum budget can't be lower than the minimum.");
  }
  if (!Object.values(OPPORTUNITY_DURATION).includes(input.duration)) {
    return failVal("Choose a valid duration.");
  }
  if (!JOB_EXPERIENCE_LEVELS.some((l) => l.value === input.experienceLevel)) {
    return failVal("Choose a valid experience level.");
  }
  const deadline = new Date(input.deadline);
  if (!input.deadline || Number.isNaN(deadline.getTime()) || deadline.getTime() <= Date.now()) {
    return failVal("Pick a deadline in the future.");
  }
  if ((input.screeningQuestions ?? []).length > JOB_SCREENING_QUESTIONS_MAX) {
    return failVal(`Jobs can have at most ${JOB_SCREENING_QUESTIONS_MAX} screening questions.`);
  }
  for (const q of input.screeningQuestions ?? []) {
    if (!q.question?.trim()) return failVal("Every screening question needs text.");
    if (q.question.trim().length > JOB_QUESTION_MAX_CHARS) {
      return failVal(`Screening questions must be ${JOB_QUESTION_MAX_CHARS} characters or fewer.`);
    }
  }
  return null;
}

// ── Aggregate (dashboard integration) ───────────────────────

export function getFindWorkSummary(): {
  openJobs: number;
  savedJobs: number;
  activeProposals: number;
} {
  const uid = currentUserId();
  const openJobs = getAllOpportunities().filter(
    (o) => o.status === OPPORTUNITY_STATUS.OPEN
  ).length;
  const savedJobs = uid ? getSavedOpportunityIds(uid).length : 0;
  const activeProposals = uid
    ? getProposalsByFreelancer(uid).filter((p) => {
        const active: ProposalStatus[] = [
          PROPOSAL_STATUS.SUBMITTED,
          PROPOSAL_STATUS.UNDER_REVIEW,
          PROPOSAL_STATUS.SHORTLISTED,
        ];
        return active.includes(p.status);
      }).length
    : 0;
  return { openJobs, savedJobs, activeProposals };
}

export { isSafeExternalUrl, currentUserId };

// ═══════════════════════════════════════════════════════════
// ASYNC BACKEND API — JOBS (NestJS /jobs)
// ═══════════════════════════════════════════════════════════
//
// All functions call apiClient and fall back to the local sync helpers
// so the UI never breaks offline / during beta with partial backend.

export interface JobResponse {
  id: string;
  title: string;
  slug: string;
  status: OpportunityStatus;
  description: string | null;
  budgetMin: number | null;
  budgetMax: number | null;
  currency: string;
  deadline: string | null;
  postedAt: string;
  createdAt: string;
  updatedAt: string;
  [key: string]: unknown;
}

export interface PaginatedJobResult {
  data: JobResponse[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Browse published jobs with search and filters.
 * Endpoint: GET /api/v1/jobs
 */
const EXPERIENCE_LEVEL_QUERY_MAP: Record<string, string> = {
  any_level: "",
  entry_level: "JUNIOR",
  beginner: "JUNIOR",
  junior: "JUNIOR",
  intermediate: "MIDLEVEL",
  midlevel: "MIDLEVEL",
  experienced: "SENIOR",
  senior: "SENIOR",
  expert: "EXPERT",
  "": "",
};

const WORK_ARRANGEMENT_QUERY_MAP: Record<string, string> = {
  remote: "REMOTE",
  on_site: "ONSITE",
  on_campus: "ONSITE",
  hybrid: "HYBRID",
};

export async function getOpportunitiesPageApi(
  query: OpportunityQuery = {}
): Promise<{ page: OpportunityPage; error: ApiError | null }> {
  const params = new URLSearchParams();

  if (query.search) params.set("search", query.search);
  if (query.categoryId) params.set("categoryId", query.categoryId);
  if (query.campusId) params.set("campusId", query.campusId);

  const normalizedExperience = query.experience?.trim();
  if (normalizedExperience) {
    const experienceLevel = EXPERIENCE_LEVEL_QUERY_MAP[normalizedExperience.toLowerCase()];
    if (experienceLevel) params.set("experienceLevel", experienceLevel);
  }

  const normalizedArrangement = query.arrangement?.trim();
  if (normalizedArrangement) {
    const locationType = WORK_ARRANGEMENT_QUERY_MAP[normalizedArrangement.toLowerCase()];
    if (locationType) params.set("locationType", locationType);
  }

  if (query.sort) params.set("sort", query.sort);
  if (query.page) params.set("page", String(query.page));
  if (query.size) params.set("limit", String(query.size));

  const qs = params.toString();
  // Backend shape: { items, meta: { total, page, limit, totalPages } }
  const { data, error } = await apiClient.get<{
    items: BackendJob[];
    meta: { total: number; page: number; limit: number; totalPages: number };
  }>(`/jobs${qs ? `?${qs}` : ""}`);
  if (!error && data) {
    return {
      page: {
        items: (data.items ?? []).map(mapBackendJob),
        total: data.meta?.total ?? 0,
        page: data.meta?.page ?? 1,
        size: data.meta?.limit ?? query.size ?? 9,
        totalPages: data.meta?.totalPages ?? 1,
      },
      error: null,
    };
  }
  return { page: emptyJobPage(query.size ?? 9), error };
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Real backend records use UUIDs; legacy demo records use short ids like "j1". */
export function isBackendId(id: string): boolean {
  return UUID_RE.test(id);
}

/** Backend job payload (modules/jobs JobResponse). */
export interface BackendJob {
  id: string;
  employer: { id: string; userId: string; displayName: string };
  title: string;
  description: string | null;
  category: { id: string; name: string } | null;
  campus: { id: string; name: string } | null;
  budgetType: string;
  budgetMin: number | null;
  budgetMax: number | null;
  experienceLevel: string | null;
  estimatedDuration: string | null;
  locationType: string;
  state: string | null;
  city: string | null;
  applicationDeadline: string | null;
  status: string;
  publishedAt: string | null;
  skills: { name: string }[];
  proposalCount?: number;
  createdAt: string;
}

const JOB_STATUS_MAP: Record<string, OpportunityStatus> = {
  PUBLISHED: OPPORTUNITY_STATUS.OPEN,
  PAUSED: OPPORTUNITY_STATUS.CLOSED,
  CLOSED: OPPORTUNITY_STATUS.CLOSED,
  EXPIRED: OPPORTUNITY_STATUS.EXPIRED,
  CANCELLED: OPPORTUNITY_STATUS.CANCELLED,
  DRAFT: OPPORTUNITY_STATUS.DRAFT,
};

const JOB_ARRANGEMENT_MAP: Record<string, OpportunityWorkArrangement> = {
  REMOTE: OPPORTUNITY_WORK_ARRANGEMENT.REMOTE,
  ONSITE: OPPORTUNITY_WORK_ARRANGEMENT.ON_SITE,
  HYBRID: OPPORTUNITY_WORK_ARRANGEMENT.HYBRID,
};

/**
 * Maps a backend job to the frontend Opportunity model. Fields the backend
 * doesn't store (requirements, screening questions, attachments, view count,
 * employer descriptor/verified flag) are left empty rather than invented;
 * the free-text estimatedDuration is bucketed into the closest duration key.
 */
export function mapBackendJob(job: BackendJob): Opportunity {
  const description = job.description ?? "";
  const duration = (job.estimatedDuration ?? "").toLowerCase();
  const workArrangement =
    JOB_ARRANGEMENT_MAP[job.locationType] ?? OPPORTUNITY_WORK_ARRANGEMENT.ON_SITE;

  return {
    id: job.id,
    title: job.title,
    categoryId: job.category?.id ?? "",
    summary: description.length > 160 ? `${description.slice(0, 157)}...` : description,
    description,
    requirements: "",
    skills: (job.skills ?? []).map((s) => s.name),
    workArrangement,
    location: {
      city: job.city ?? undefined,
      state: job.state ?? undefined,
      campusId: job.campus?.id,
      remote: workArrangement === OPPORTUNITY_WORK_ARRANGEMENT.REMOTE,
    },
    budget: {
      type:
        job.budgetType === "HOURLY"
          ? OPPORTUNITY_BUDGET_TYPE.HOURLY
          : OPPORTUNITY_BUDGET_TYPE.PROJECT,
      min: job.budgetMin != null ? Number(job.budgetMin) : undefined,
      max: job.budgetMax != null ? Number(job.budgetMax) : undefined,
      currency: "NGN",
    },
    duration: /long|6|year/.test(duration)
      ? OPPORTUNITY_DURATION.LONG_TERM
      : /month/.test(duration)
      ? OPPORTUNITY_DURATION.ONE_TO_THREE_MONTHS
      : /week/.test(duration)
      ? OPPORTUNITY_DURATION.FEW_WEEKS
      : OPPORTUNITY_DURATION.SHORT_TERM,
    experienceLevel: (job.experienceLevel ?? "").toLowerCase(),
    postedAt: job.publishedAt ?? job.createdAt,
    deadline: job.applicationDeadline ?? "",
    status: JOB_STATUS_MAP[job.status] ?? OPPORTUNITY_STATUS.DRAFT,
    employer: {
      id: job.employer.id,
      name: job.employer.displayName,
      descriptor: "",
      location: [job.city, job.state].filter(Boolean).join(", "),
      verified: false,
    },
    employerUserId: job.employer.userId,
    screeningQuestions: [],
    attachments: [],
    viewCount: 0,
    proposalCount: job.proposalCount ?? 0,
  };
}

/**
 * Get a single published job by ID.
 * Endpoint: GET /api/v1/jobs/:id
 */
export async function getJobByIdApi(
  id: string
): Promise<{ job: Opportunity | null; error: ApiError | null }> {
  const { data, error } = await apiClient.get<BackendJob>(`/jobs/${id}`);
  if (!error && data) return { job: mapBackendJob(data), error: null };
  return { job: null, error };
}

/**
 * List jobs created by the authenticated employer.
 * Endpoint: GET /api/v1/jobs/me
 */
export async function getMyJobsApi(
  page = 1,
  limit = 20
): Promise<{ result: PaginatedJobResult | null; error: ApiError | null }> {
  const { data, error } = await apiClient.get<PaginatedJobResult>(
    `/jobs/me?page=${page}&limit=${limit}`
  );
  if (!error && data) return { result: data, error: null };
  return { result: null, error };
}

/**
 * Create a new job as a DRAFT.
 * Endpoint: POST /api/v1/jobs
 */
export async function createJobApi(
  input: OpportunityInput
): Promise<{ job: JobResponse | null; error: ApiError | null }> {
  const { data, error } = await apiClient.post<OpportunityInput, JobResponse>("/jobs", input);
  if (!error && data) return { job: data, error: null };
  return { job: null, error };
}

/**
 * Update a DRAFT job.
 * Endpoint: PATCH /api/v1/jobs/:id
 */
export async function updateJobApi(
  id: string,
  input: Partial<OpportunityInput>
): Promise<{ job: JobResponse | null; error: ApiError | null }> {
  const { data, error } = await apiClient.patch<Partial<OpportunityInput>, JobResponse>(
    `/jobs/${id}`,
    input
  );
  if (!error && data) return { job: data, error: null };
  return { job: null, error };
}

/**
 * Publish a DRAFT job (DRAFT → OPEN after moderation).
 * Endpoint: POST /api/v1/jobs/:id/publish
 */
export async function publishJobApi(
  id: string
): Promise<{ job: JobResponse | null; error: ApiError | null }> {
  const { data, error } = await apiClient.post<undefined, JobResponse>(`/jobs/${id}/publish`);
  if (!error && data) return { job: data, error: null };
  return { job: null, error };
}

/**
 * Pause a live job posting.
 * Endpoint: POST /api/v1/jobs/:id/pause
 */
export async function pauseJobApi(
  id: string
): Promise<{ job: JobResponse | null; error: ApiError | null }> {
  const { data, error } = await apiClient.post<undefined, JobResponse>(`/jobs/${id}/pause`);
  if (!error && data) return { job: data, error: null };
  return { job: null, error };
}

/**
 * Close a live job posting.
 * Endpoint: POST /api/v1/jobs/:id/close
 */
export async function closeJobApi(
  id: string
): Promise<{ job: JobResponse | null; error: ApiError | null }> {
  const { data, error } = await apiClient.post<undefined, JobResponse>(`/jobs/${id}/close`);
  if (!error && data) return { job: data, error: null };
  return { job: null, error };
}

/**
 * Cancel a job.
 * Endpoint: POST /api/v1/jobs/:id/cancel
 */
export async function cancelJobApi(
  id: string
): Promise<{ job: JobResponse | null; error: ApiError | null }> {
  const { data, error } = await apiClient.post<undefined, JobResponse>(`/jobs/${id}/cancel`);
  if (!error && data) return { job: data, error: null };
  return { job: null, error };
}
