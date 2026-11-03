// ============================================================
// FREELANCE CONTRACT HELPERS  (Module 24)
// ============================================================
// Pure presentation helpers: deadline UX, file-size formatting, safe URL
// handling, and client-side file validation. Crucially, these are UX helpers
// only — they are NOT a security boundary. The backend re-validates everything.

import type { Contract, ContractStatus } from "@/types/contract";
import { CONTRACT_STATUS } from "@/types/contract";

// ── Deadline UX ─────────────────────────────────────────────
// Uses the backend-supplied timestamp (ISO string) as the single source of
// truth. All comparisons use the same clock so we avoid misleading "due in X"
// drift. Returns an intent the component can style + a human label.

export type DeadlineIntent = "upcoming" | "due_soon" | "due_today" | "overdue" | "completed";

export interface DeadlineInfo {
  intent: DeadlineIntent;
  label: string;
  /** True when the deadline has already passed and work remains. */
  isOverdue: boolean;
}

export function getDeadlineInfo(
  dueDate: string,
  contractStatus?: ContractStatus
): DeadlineInfo {
  const due = new Date(dueDate);
  const now = new Date();

  if (contractStatus === CONTRACT_STATUS.COMPLETED || contractStatus === CONTRACT_STATUS.CANCELLED) {
    return { intent: "completed", label: "Completed", isOverdue: false };
  }

  const msOneDay = 86_400_000;
  // Compare calendar days relative to today (start of day) to be timezone-stable.
  const startOf = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const diffDays = Math.round((startOf(due) - startOf(now)) / msOneDay);

  if (diffDays < 0) {
    const overdue = Math.abs(diffDays);
    return {
      intent: "overdue",
      label: overdue === 1 ? "1 day overdue" : `${overdue} days overdue`,
      isOverdue: true,
    };
  }
  if (diffDays === 0) {
    return { intent: "due_today", label: "Due today", isOverdue: false };
  }
  if (diffDays === 1) {
    return { intent: "due_soon", label: "Due tomorrow", isOverdue: false };
  }
  if (diffDays <= 3) {
    return { intent: "due_soon", label: `Due in ${diffDays} days`, isOverdue: false };
  }
  return { intent: "upcoming", label: `Due ${due.toLocaleDateString("en-NG", { month: "short", day: "numeric" })}`, isOverdue: false };
}

// ── Review window (automatic release) ───────────────────────
// The backend decides when submitted work releases on its own and sends that
// moment as `autoReleaseAt`. We only describe it: how far away it is, and
// whether it is close enough to nudge the employer.

export interface ReviewWindowInfo {
  /** e.g. "in 6 days", "in 5 hours". */
  relative: string;
  /** e.g. "10 Nov, 12:00" in the viewer's timezone. */
  absolute: string;
  /** True for the last stretch, when the employer should be pushed to act. */
  urgent: boolean;
}

/** Matches the backend's reminder lead time; presentation only. */
const REVIEW_URGENT_WITHIN_MS = 48 * 3_600_000;

export function getReviewWindowInfo(autoReleaseAt: string, now = Date.now()): ReviewWindowInfo {
  const due = new Date(autoReleaseAt);
  const ms = due.getTime() - now;
  const hours = Math.floor(ms / 3_600_000);
  const days = Math.floor(hours / 24);

  let relative: string;
  if (ms <= 0) relative = "shortly";
  else if (hours < 1) relative = "within the hour";
  else if (hours < 24) relative = `in ${hours} ${hours === 1 ? "hour" : "hours"}`;
  else relative = `in ${days} ${days === 1 ? "day" : "days"}`;

  return {
    relative,
    absolute: due.toLocaleString("en-NG", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }),
    urgent: ms <= REVIEW_URGENT_WITHIN_MS,
  };
}

// ── File size formatting ────────────────────────────────────

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

// ── Safe URL validation ─────────────────────────────────────
// External links supplied by users/clients are untrusted. Reject dangerous
// schemes so we never render javascript:/data:/vbscript: in href.

const SAFE_URL_SCHEMES = ["https:", "http:"];

export function isSafeExternalUrl(raw: string): boolean {
  try {
    const parsed = new URL(raw);
    return SAFE_URL_SCHEMES.includes(parsed.protocol);
  } catch {
    return false;
  }
}

export function sanitizeExternalUrl(raw: string): string {
  const trimmed = raw.trim();
  return isSafeExternalUrl(trimmed) ? trimmed : "";
}

// ── Client-side file validation (UX only, not security) ─────

export const CONTRACT_ALLOWED_EXTENSIONS = [
  "pdf",
  "doc",
  "docx",
  "txt",
  "md",
  "zip",
  "rar",
  "png",
  "jpg",
  "jpeg",
  "gif",
  "svg",
  "fig",
  "sketch",
  "xlsx",
  "csv",
];

export const CONTRACT_MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 MB
export const CONTRACT_MAX_FILE_COUNT = 5;

export interface ContractFileValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateContractFiles(files: File[]): ContractFileValidationResult {
  const errors: string[] = [];

  if (files.length === 0) {
    errors.push("Please attach at least one file.");
    return { valid: false, errors };
  }
  if (files.length > CONTRACT_MAX_FILE_COUNT) {
    errors.push(`You can attach up to ${CONTRACT_MAX_FILE_COUNT} files.`);
    return { valid: false, errors };
  }

  for (const file of files) {
    const ext = (file.name.split(".").pop() ?? "").toLowerCase();
    if (!CONTRACT_ALLOWED_EXTENSIONS.includes(ext)) {
      errors.push(`"${file.name}" has an unsupported file type (.${ext || "unknown"}).`);
      continue;
    }
    if (file.size > CONTRACT_MAX_FILE_SIZE) {
      errors.push(`"${file.name}" exceeds the ${formatFileSize(CONTRACT_MAX_FILE_SIZE)} limit.`);
    }
    // Note: file.type (MIME) is only advisory; the backend must re-check.
  }

  return { valid: errors.length === 0, errors };
}

// ── Contract action summary (drives the freelancer card) ────

export function getContractActionTitle(status: ContractStatus): string {
  switch (status) {
    case CONTRACT_STATUS.PENDING_ACCEPTANCE:
      return "Action required";
    case CONTRACT_STATUS.AWAITING_FUNDING:
      return "Waiting for client";
    case CONTRACT_STATUS.AWAITING_CLIENT_REVIEW:
      return "Waiting for client";
    case CONTRACT_STATUS.REVISION_REQUESTED:
      return "Action required";
    case CONTRACT_STATUS.DISPUTED:
      return "Under dispute";
    case CONTRACT_STATUS.COMPLETED:
      return "Project completed";
    default:
      return "In progress";
  }
}

// ── Derived workflow progress ───────────────────────────────
// Backend supplies authoritative `progress`; we only derive a fallback from
// milestone states when progress is missing. This is workflow-only, never
// financial.

export function deriveContractProgress(c: Contract): number {
  if (typeof c.progress === "number") return c.progress;
  if (c.totalMilestones === 0) return 0;
  return Math.round((c.completedMilestones / c.totalMilestones) * 100);
}
