import { cn } from "@/lib/utils";
import { badgeVariantClasses, type BadgeVariant } from "@/components/admin/StatusBadge";

const STATUS_LABEL: Record<string, string> = {
  submitted: "Submitted",
  under_review: "Under review",
  shortlisted: "Shortlisted",
  accepted: "Accepted",
  rejected: "Rejected",
  withdrawn: "Withdrawn",
};

const STATUS_VARIANT: Record<string, BadgeVariant> = {
  submitted: "blue",
  under_review: "info",
  shortlisted: "gold",
  accepted: "success",
  rejected: "error",
  withdrawn: "neutral",
};

/** "under_review" reads as "Under review"; a status the console has no word for is tidied. */
export function applicantStatusLabel(status: string): string {
  return (
    STATUS_LABEL[status] ??
    status.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase())
  );
}

export function ApplicantStatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium",
        badgeVariantClasses(STATUS_VARIANT[status] ?? "neutral")
      )}
    >
      {applicantStatusLabel(status)}
    </span>
  );
}
