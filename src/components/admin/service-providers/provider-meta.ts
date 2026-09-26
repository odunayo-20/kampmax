import type { BadgeVariant } from "@/components/admin/StatusBadge";
import type { ServiceProviderStatus } from "@/services/admin/service-provider-management.api";

export const PROVIDER_STATUS_LABELS: Record<ServiceProviderStatus, string> = {
  approved: "Approved",
  pending_review: "Pending review",
  suspended: "Suspended",
  rejected: "Rejected",
};

export const PROVIDER_STATUS_ORDER: (ServiceProviderStatus | "all")[] = [
  "all",
  "approved",
  "pending_review",
  "suspended",
  "rejected",
];

export function providerStatusVariant(status: ServiceProviderStatus): BadgeVariant {
  switch (status) {
    case "approved":
      return "success";
    case "pending_review":
      return "warning";
    case "suspended":
      return "error";
    default:
      return "neutral";
  }
}

/** Which moderation actions each status allows. */
export function providerActions(status: ServiceProviderStatus): {
  approve: boolean;
  reject: boolean;
  suspend: boolean;
  restore: boolean;
} {
  return {
    approve: status === "pending_review" || status === "rejected",
    reject: status === "pending_review",
    suspend: status === "approved" || status === "pending_review",
    restore: status === "suspended",
  };
}

export type ProviderActionKind = "approve" | "reject" | "suspend" | "restore";

export const PROVIDER_ACTION_COPY: Record<
  ProviderActionKind,
  {
    title: (name: string) => string;
    message: string;
    confirm: string;
    tone: "default" | "warning" | "danger";
    reasonLabel?: string;
    success: string;
  }
> = {
  approve: {
    title: (n) => `Approve ${n}?`,
    message:
      "The provider becomes visible to customers and can receive bookings. They are emailed.",
    confirm: "Approve provider",
    tone: "default",
    success: "Provider approved and notified.",
  },
  reject: {
    title: (n) => `Reject ${n}?`,
    message:
      "The application is rejected and the provider can't receive bookings. Your reason is emailed to them.",
    confirm: "Reject provider",
    tone: "danger",
    reasonLabel: "Reason for rejection (emailed to the provider)",
    success: "Provider rejected and notified.",
  },
  suspend: {
    title: (n) => `Suspend ${n}?`,
    message:
      "The provider is hidden and can't receive new bookings until restored. Your reason is emailed to them.",
    confirm: "Suspend provider",
    tone: "warning",
    reasonLabel: "Reason for suspension (emailed to the provider)",
    success: "Provider suspended and notified.",
  },
  restore: {
    title: (n) => `Restore ${n}?`,
    message:
      "The suspension is lifted and the provider is approved again. They are emailed.",
    confirm: "Restore provider",
    tone: "default",
    success: "Provider restored and notified.",
  },
};
