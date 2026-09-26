// ============================================================
// JOBS META (Module 40)
// ============================================================
// Presentation maps + badge variants for the admin jobs console.
// Labels cover the REAL opportunity vocabulary only — spelling and
// values mirror src/config/jobs.ts and the opportunity store.

import type { BadgeVariant } from "@/components/admin/StatusBadge";
import type {
  ManagedJobModeration,
  ManagedJobPublication,
  ManagedJobStatus,
} from "@/types/admin";

export const JOB_STATUS_TABS: (ManagedJobStatus | "all")[] = [
  "all",
  "open",
  "draft",
  "pending_review",
  "paused",
  "closed",
  "expired",
  "cancelled",
];

export const JOB_STATUS_LABELS: Record<ManagedJobStatus, string> = {
  open: "Open",
  draft: "Draft",
  pending_review: "Pending review",
  paused: "Paused",
  closed: "Closed",
  expired: "Expired",
  cancelled: "Cancelled",
};

export const JOB_STATUS_DOTS: Record<ManagedJobStatus, string> = {
  open: "bg-kampmax-success",
  draft: "bg-kampmax-text-secondary/50",
  pending_review: "bg-kampmax-info",
  paused: "bg-kampmax-warning",
  closed: "bg-kampmax-text-secondary/50",
  expired: "bg-kampmax-warning",
  cancelled: "bg-kampmax-error",
};

export const JOB_PUBLICATION_OPTIONS: (ManagedJobPublication | "all")[] = [
  "all",
  "published",
  "unpublished",
  "ended",
];

export const JOB_PUBLICATION_LABELS: Record<ManagedJobPublication, string> = {
  published: "Published",
  unpublished: "Unpublished",
  ended: "Ended",
};

export const JOB_MODERATION_LABELS: Record<ManagedJobModeration, string> = {
  pending_review: "Pending review",
  not_submitted: "Not submitted",
  not_applicable: "Not applicable",
};

export const ARRANGEMENT_OPTIONS: (string | "all")[] = [
  "all",
  "remote",
  "on_site",
  "hybrid",
];

export const ARRANGEMENT_LABELS: Record<string, string> = {
  remote: "Remote",
  on_site: "On-site",
  on_campus: "On campus",
  hybrid: "Hybrid",
};

export const DURATION_LABELS: Record<string, string> = {
  short_term: "Short-term",
  few_weeks: "A few weeks",
  one_to_three_months: "1–3 months",
  long_term: "3+ months / ongoing",
};

export const EXPERIENCE_LABELS: Record<string, string> = {
  entry_level: "Entry level",
  intermediate: "Intermediate",
  experienced: "Experienced",
  expert: "Expert",
  any_level: "Any level",
};

export const BUDGET_TYPE_LABELS: Record<string, string> = {
  hourly: "Hourly",
  project: "Fixed project",
  contract: "Contract",
};

export function durationLabelOf(value: string): string {
  return DURATION_LABELS[value] ?? (value.trim() || "—");
}

export function experienceLabelOf(value: string): string {
  return EXPERIENCE_LABELS[value] ?? "—";
}

export function budgetTypeLabelOf(value: string): string {
  return BUDGET_TYPE_LABELS[value] ?? "—";
}

/** Naira range renderer. Empty values render honestly as "Not stated". */
export function formatJobBudget(min: number | null, max: number | null): string {
  const parts = [min, max].filter((n): n is number => n !== null && Number.isFinite(n));
  if (parts.length === 0) return "Not stated";
  if (parts.length === 1) return `₦${parts[0].toLocaleString("en-NG")}`;
  const [a, b] = parts;
  return a === b
    ? `₦${a.toLocaleString("en-NG")}`
    : `₦${a.toLocaleString("en-NG")} – ₦${b.toLocaleString("en-NG")}`;
}

// ------------------------------------------------------------
// Badge variant mappers
// ------------------------------------------------------------

const jobStatusMap: Record<ManagedJobStatus, BadgeVariant> = {
  open: "success",
  draft: "neutral",
  pending_review: "info",
  paused: "warning",
  closed: "neutral",
  expired: "warning",
  cancelled: "error",
};

const jobPublicationMap: Record<ManagedJobPublication, BadgeVariant> = {
  published: "success",
  unpublished: "neutral",
  ended: "warning",
};

const jobModerationMap: Record<ManagedJobModeration, BadgeVariant> = {
  pending_review: "info",
  not_submitted: "neutral",
  not_applicable: "neutral",
};

const arrangementMap: Record<string, BadgeVariant> = {
  remote: "blue",
  hybrid: "info",
  on_campus: "gold",
  on_site: "neutral",
};

export function jobStatusVariant(status: ManagedJobStatus): BadgeVariant {
  return jobStatusMap[status] ?? "neutral";
}

export function jobPublicationVariant(
  publication: ManagedJobPublication
): BadgeVariant {
  return jobPublicationMap[publication] ?? "neutral";
}

export function jobModerationVariant(
  moderation: ManagedJobModeration
): BadgeVariant {
  return jobModerationMap[moderation] ?? "neutral";
}

export function arrangementVariant(arrangement: string): BadgeVariant {
  return arrangementMap[arrangement] ?? "neutral";
}