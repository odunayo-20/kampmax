// ============================================================
// JOBS MARKETPLACE CONFIG  (Module 27)
// ============================================================
// Presentation + UX constants for the jobs marketplace and employer job
// management. No business logic — page sizes, input length limits and
// filter tabs only. Length limits mirror what the backend DTOs will allow.

import type { OpportunityStatus, OpportunityType } from "@/types/opportunity";
import { OPPORTUNITY_STATUS } from "@/types/opportunity";

// ── Pagination ──────────────────────────────────────────────

export const JOBS_PAGE_SIZE = 9;
export const EMPLOYER_JOBS_PAGE_SIZE = 10;

// ── Input limits (mirror backend DTO validation) ────────────

export const JOB_TITLE_MAX_CHARS = 120;
export const JOB_SUMMARY_MAX_CHARS = 400;
export const JOB_DESCRIPTION_MAX_CHARS = 10000;
export const JOB_REQUIREMENTS_MAX_CHARS = 10000;
export const JOB_SKILL_MAX_COUNT = 12;
export const JOB_SCREENING_QUESTIONS_MAX = 10;
export const JOB_QUESTION_MAX_CHARS = 300;
export const JOB_DEADLINE_MIN_DAYS = 1;
// Hiring postings (vacancies and internships).
export const JOB_ELIGIBILITY_MAX_CHARS = 300;
export const JOB_OPENINGS_MAX = 500;
export const JOB_DURATION_MONTHS_MAX = 60;

// ── Search debounce (matches Find Work) ─────────────────────

export const JOB_SEARCH_DEBOUNCE_MS = 300;

// ── Employer job type filter (My Jobs) ──────────────────────

export const EMPLOYER_JOB_TYPE_TABS: { value: OpportunityType | "all"; label: string }[] = [
  { value: "all", label: "All types" },
  { value: "gig", label: "Gigs" },
  { value: "internship", label: "Internships" },
  { value: "full_time", label: "Full-time" },
  { value: "part_time", label: "Part-time" },
  { value: "contract", label: "Contract" },
];

// ── Employer job filter tabs (statuses the store exposes) ───

export const EMPLOYER_JOB_FILTER_TABS: {
  value: OpportunityStatus | "all";
  label: string;
}[] = [
  { value: "all", label: "All jobs" },
  { value: OPPORTUNITY_STATUS.DRAFT, label: "Drafts" },
  { value: OPPORTUNITY_STATUS.PENDING_REVIEW, label: "Pending review" },
  { value: OPPORTUNITY_STATUS.OPEN, label: "Open" },
  { value: OPPORTUNITY_STATUS.CLOSED, label: "Closed" },
  { value: OPPORTUNITY_STATUS.EXPIRED, label: "Expired" },
  { value: OPPORTUNITY_STATUS.CANCELLED, label: "Cancelled" },
];