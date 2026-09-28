import type { BadgeVariant } from "@/components/admin/StatusBadge";
import type {
  ManagedReviewReportReason,
  ManagedReviewSortField,
  ManagedReviewStatus,
  ManagedReviewStatusSource,
  ManagedReviewTargetType,
} from "@/types/admin";

// ------------------------------------------------------------
// REVIEW STATUS
// ------------------------------------------------------------
// The console surfaces four states. "published" is derived for storefront
// reviews (their presence in the public store is their publication) or the
// real backend-owned field for profile reviews. Nothing else is invented.

export const REVIEW_STATUS_TABS: (ManagedReviewStatus | "all")[] = [
  "all",
  "published",
  "pending",
  "hidden",
  "flagged",
  "removed",
];

export const REVIEW_STATUS_LABELS: Record<ManagedReviewStatus, string> = {
  published: "Published",
  pending: "Pending",
  hidden: "Hidden",
  flagged: "Flagged",
  removed: "Removed",
};

export function reviewStatusLabel(status: ManagedReviewStatus): string {
  return REVIEW_STATUS_LABELS[status] ?? status;
}

export const REVIEW_STATUS_DOTS: Record<ManagedReviewStatus, string> = {
  published: "bg-kampmax-success",
  pending: "bg-kampmax-info",
  hidden: "bg-kampmax-warning",
  flagged: "bg-kampmax-error",
  removed: "bg-kampmax-error",
};

export function reviewStatusVariant(status: ManagedReviewStatus): BadgeVariant {
  switch (status) {
    case "published":
      return "success";
    case "pending":
      return "info";
    case "hidden":
      return "warning";
    case "flagged":
      return "error";
    case "removed":
      return "error";
  }
}

// ------------------------------------------------------------
// STATUS SOURCE ("store" vs "derived")
// ------------------------------------------------------------

export const REVIEW_SOURCE_LABELS: Record<ManagedReviewStatusSource, string> = {
  store: "Backend status",
  derived: "Derived",
};

export function reviewStatusSourceLabel(
  source: ManagedReviewStatusSource
): string {
  return REVIEW_SOURCE_LABELS[source] ?? source;
}

export function reviewStatusSourceVariant(
  source: ManagedReviewStatusSource
): BadgeVariant {
  return source === "store" ? "neutral" : "blue";
}

// ------------------------------------------------------------
// TARGET TYPES
// ------------------------------------------------------------

export const REVIEW_TARGET_TYPE_OPTIONS: (ManagedReviewTargetType | "all")[] = [
  "all",
  "product",
  "vendor",
  "freelancer",
  "service_provider",
  "employer",
];

export const REVIEW_TARGET_TYPE_LABELS: Record<ManagedReviewTargetType, string> = {
  product: "Product",
  vendor: "Vendor",
  freelancer: "Freelancer",
  service_provider: "Service provider",
  employer: "Employer",
};

export function reviewTargetTypeLabel(type: ManagedReviewTargetType): string {
  return REVIEW_TARGET_TYPE_LABELS[type] ?? type;
}

export function reviewTargetTypeVariant(
  type: ManagedReviewTargetType | "all"
): BadgeVariant {
  switch (type) {
    case "product":
      return "blue";
    case "vendor":
      return "gold";
    case "freelancer":
      return "info";
    case "service_provider":
      return "blue";
    case "employer":
    default:
      return "neutral";
  }
}

// ------------------------------------------------------------
// SORT
// ------------------------------------------------------------

export const REVIEW_SORT_OPTIONS: {
  value: ManagedReviewSortField;
  label: string;
}[] = [
  { value: "createdAt", label: "Date" },
  { value: "rating", label: "Rating" },
  { value: "helpful", label: "Helpful" },
  { value: "reported", label: "Reports" },
];

// ------------------------------------------------------------
// VENDOR-RESPONSE FILTER
// ------------------------------------------------------------

export const REVIEW_RESPONSE_OPTIONS: ("all" | "answered" | "unanswered")[] = [
  "all",
  "answered",
  "unanswered",
];

export const REVIEW_RESPONSE_LABELS: Record<
  "all" | "answered" | "unanswered",
  string
> = {
  all: "Any response",
  answered: "Has vendor response",
  unanswered: "No vendor response",
};

// ------------------------------------------------------------
// REPORT REASONS (real vocab from the stores)
// ------------------------------------------------------------

export const REVIEW_REPORT_REASON_LABELS: Record<
  ManagedReviewReportReason,
  string
> = {
  spam: "Spam or duplicate",
  fake: "Suspected fake review",
  inappropriate: "Inappropriate content",
  offensive: "Offensive language",
  irrelevant: "Irrelevant content",
  other: "Other",
};

export function reviewReportReasonLabel(
  reason: ManagedReviewReportReason
): string {
  return REVIEW_REPORT_REASON_LABELS[reason] ?? reason;
}