import type { ApplicationStatus } from "@/services/job-applications";

// ============================================================
// CV LIBRARY & APPLICATION LIMITS
// ============================================================
// Mirrors what the backend enforces, so the screen can say "no" before a file
// is sent. The backend still checks everything (including the file's real
// content), so these are for fast feedback only.

/** How many CVs one person may keep. */
export const CV_MAX_COUNT = 3;

/** The biggest CV file, in bytes (3 MB). */
export const CV_MAX_BYTES = 3 * 1024 * 1024;

export const CV_LABEL_MAX_CHARS = 80;
export const APPLICATION_COVER_NOTE_MAX_CHARS = 2000;
export const APPLICATION_ANSWER_MAX_CHARS = 1000;
export const APPLICATION_EMPLOYER_NOTE_MAX_CHARS = 1000;

/** What the file picker offers. */
export const CV_ACCEPT =
  ".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document";

export const CV_ALLOWED_EXTENSIONS = ["pdf", "docx"] as const;

export const APPLICATIONS_PAGE_SIZE = 10;
export const APPLICANTS_PAGE_SIZE = 20;

// ── Application status wording ──────────────────────────────

export type StatusTone = "default" | "success" | "warning" | "error" | "info" | "outline";

/** How a status reads to the person who applied. */
export const APPLICANT_STATUS_META: Record<
  ApplicationStatus,
  { label: string; tone: StatusTone; hint: string }
> = {
  SUBMITTED: { label: "Sent", tone: "info", hint: "Your application is with the employer." },
  VIEWED: { label: "Seen", tone: "info", hint: "The employer has opened your CV." },
  SHORTLISTED: { label: "Shortlisted", tone: "success", hint: "You made the shortlist." },
  REJECTED: { label: "Not selected", tone: "error", hint: "The employer went with someone else." },
  HIRED: { label: "Hired", tone: "success", hint: "Congratulations, you got the role." },
  WITHDRAWN: { label: "Withdrawn", tone: "default", hint: "You took this application back." },
};

/** How a status reads to the employer reviewing applicants. */
export const EMPLOYER_STATUS_META: Record<
  ApplicationStatus,
  { label: string; tone: StatusTone }
> = {
  SUBMITTED: { label: "New", tone: "info" },
  VIEWED: { label: "Seen", tone: "outline" },
  SHORTLISTED: { label: "Shortlisted", tone: "success" },
  REJECTED: { label: "Not selected", tone: "error" },
  HIRED: { label: "Hired", tone: "success" },
  WITHDRAWN: { label: "Withdrawn", tone: "default" },
};

/** The tabs on an employer's applicant list. */
export const APPLICANT_FILTER_TABS: { value: ApplicationStatus | "ALL"; label: string }[] = [
  { value: "ALL", label: "All" },
  { value: "SUBMITTED", label: "New" },
  { value: "VIEWED", label: "Seen" },
  { value: "SHORTLISTED", label: "Shortlisted" },
  { value: "HIRED", label: "Hired" },
  { value: "REJECTED", label: "Not selected" },
];

/** True while an applicant can still take their application back. */
export function canWithdraw(status: ApplicationStatus): boolean {
  return status === "SUBMITTED" || status === "VIEWED" || status === "SHORTLISTED";
}
