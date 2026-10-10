import type { BadgeVariant } from "@/components/admin/StatusBadge";
import type {
  EmployerConsoleStatus,
  EmployerActivityKind,
  EmployerBucket,
  EmployerHiringStatus,
  ManagedEmployer,
} from "@/types/admin";

// ------------------------------------------------------------
// LABELS
// ------------------------------------------------------------

export const EMPLOYER_STATUS_LABELS: Record<EmployerConsoleStatus, string> = {
  active: "Active",
  pending_review: "Pending review",
  suspended: "Suspended",
  rejected: "Rejected",
  external: "External",
  incomplete: "Incomplete",
};

/** Console buckets shown as tabs. */
export const EMPLOYER_QUEUE_LABELS: Record<EmployerBucket | "all", string> = {
  all: "All employers",
  active: "Active",
  pending_review: "Pending review",
  suspended: "Suspended",
  rejected: "Rejected",
  external: "External",
  incomplete: "Incomplete",
};

export const EMPLOYER_ACTIVITY_LABELS: Record<EmployerActivityKind, string> = {
  profile: "Profile",
  verification: "Verification",
  jobs: "Jobs",
  hiring: "Hiring",
  reviews: "Reviews",
  admin: "Admin actions",
};

/** Real EmployerVerificationStatus values plus the "none" bucket. */
export const EMPLOYER_VERIFICATION_LABELS: Record<string, string> = {
  not_started: "Not started",
  pending: "Pending",
  verified: "Verified",
  rejected: "Rejected",
  action_required: "Action required",
  none: "No verification",
};

/** Verification filter values (real backend values + "none"/"all"). */
export const VALID_VERIFICATION_FILTER_VALUES = [
  "not_started",
  "pending",
  "verified",
  "rejected",
  "action_required",
  "none",
] as const;

export function validVerification(value: string): boolean {
  return (VALID_VERIFICATION_FILTER_VALUES as readonly string[]).includes(value);
}

export const EMPLOYER_HIRING_LABELS: Record<EmployerHiringStatus, string> = {
  hiring: "Hiring",
  not_hiring: "Not hiring",
};

export function employerStatusLabel(status: EmployerConsoleStatus): string {
  return EMPLOYER_STATUS_LABELS[status] ?? status.replace(/_/g, " ");
}

export function employerHiringLabel(status: EmployerHiringStatus): string {
  return EMPLOYER_HIRING_LABELS[status];
}

// ------------------------------------------------------------
// BADGE VARIANTS
// ------------------------------------------------------------

export function employerStatusBadgeVariant(
  status: EmployerConsoleStatus
): BadgeVariant {
  switch (status) {
    case "active":
      return "success";
    case "pending_review":
      return "warning";
    case "suspended":
      return "error";
    case "rejected":
      return "neutral";
    case "external":
      return "info";
    case "incomplete":
      return "neutral";
  }
}

export function employerVerificationBadgeVariant(
  status: string | null
): BadgeVariant {
  switch (status) {
    case "verified":
      return "success";
    case "pending":
      return "warning";
    case "rejected":
      return "error";
    case "action_required":
      return "warning";
    default:
      return "neutral";
  }
}

export function employerHiringBadgeVariant(
  status: EmployerHiringStatus
): BadgeVariant {
  return status === "hiring" ? "success" : "neutral";
}

// ------------------------------------------------------------
// ACTION AVAILABILITY
// ------------------------------------------------------------

export interface EmployerActionAvailability {
  canApprove: boolean;
  canReject: boolean;
  canSuspend: boolean;
  canRestore: boolean;
}

export function getEmployerActionAvailability(
  employer: ManagedEmployer
): EmployerActionAvailability {
  // Matches what the backend accepts: anything not suspended can be approved
  // (unless already active) or suspended; reject needs a decision still open.
  const s = employer.status;
  return {
    canApprove: s === "pending_review" || s === "incomplete" || s === "rejected",
    canReject: s === "pending_review" || s === "incomplete",
    canSuspend: s === "active" || s === "pending_review" || s === "incomplete" || s === "rejected",
    canRestore: s === "suspended",
  };
}