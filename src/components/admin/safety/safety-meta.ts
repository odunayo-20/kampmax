import type { BadgeVariant } from "@/components/admin/StatusBadge";
import type {
  TrustSafetyReportStatus,
  TrustSafetySortField,
  TrustSafetySource,
  TrustSafetyTargetType,
} from "@/types/admin";

// ------------------------------------------------------------
// REPORT SOURCE
// ------------------------------------------------------------

export const SAFETY_SOURCE_TABS: (TrustSafetySource | "all")[] = [
  "all",
  "review",
  "campus_post",
  "store",
  "service",
];

export const SAFETY_SOURCE_LABELS: Record<TrustSafetySource, string> = {
  review: "Review",
  campus_post: "Campus post",
  store: "Store",
  service: "Service",
};

export function safetySourceLabel(source: TrustSafetySource): string {
  return SAFETY_SOURCE_LABELS[source] ?? source;
}

export function safetySourceVariant(source: TrustSafetySource): BadgeVariant {
  switch (source) {
    case "review":
      return "blue";
    case "campus_post":
      return "gold";
    case "store":
      return "info";
    case "service":
      return "success";
  }
}

// ------------------------------------------------------------
// REPORT STATUS
// ------------------------------------------------------------
// Derived only — see the data-module header for the derivation rules. No
// store records a report-level status; "open" / "reviewing" / "resolved"
// reflect the reported target's OWN real state.

export const SAFETY_STATUS_TABS: (TrustSafetyReportStatus | "all")[] = [
  "all",
  "open",
  "reviewing",
  "resolved",
  "dismissed",
];

export const SAFETY_STATUS_LABELS: Record<TrustSafetyReportStatus, string> = {
  open: "Open",
  reviewing: "Reviewing",
  resolved: "Resolved",
  dismissed: "Dismissed",
};

export function safetyStatusLabel(status: TrustSafetyReportStatus): string {
  return SAFETY_STATUS_LABELS[status] ?? status;
}

export function safetyStatusVariant(status: TrustSafetyReportStatus): BadgeVariant {
  switch (status) {
    case "open":
      return "error";
    case "reviewing":
      return "warning";
    case "resolved":
      return "success";
    case "dismissed":
      return "neutral";
  }
}

// ------------------------------------------------------------
// TARGET TYPE
// ------------------------------------------------------------

export const SAFETY_TARGET_TYPE_OPTIONS: (TrustSafetyTargetType | "all")[] = [
  "all",
  "product",
  "vendor",
  "freelancer",
  "service_provider",
  "employer",
  "post",
];

export const SAFETY_TARGET_TYPE_LABELS: Record<TrustSafetyTargetType, string> = {
  product: "Product",
  vendor: "Vendor",
  freelancer: "Freelancer",
  service_provider: "Service provider",
  employer: "Employer",
  post: "Post",
};

export function safetyTargetTypeLabel(targetType: TrustSafetyTargetType): string {
  return SAFETY_TARGET_TYPE_LABELS[targetType] ?? targetType;
}

export function safetyTargetTypeVariant(
  targetType: TrustSafetyTargetType
): BadgeVariant {
  switch (targetType) {
    case "product":
      return "blue";
    case "vendor":
      return "gold";
    case "freelancer":
      return "info";
    case "service_provider":
      return "blue";
    case "employer":
      return "neutral";
    case "post":
      return "warning";
  }
}

// ------------------------------------------------------------
// SORTING
// ------------------------------------------------------------

export const SAFETY_SORT_FIELDS: TrustSafetySortField[] = [
  "createdAt",
  "entityReportCount",
];

export const SAFETY_SORT_LABELS: Record<TrustSafetySortField, string> = {
  createdAt: "Created",
  entityReportCount: "Entity reports",
};