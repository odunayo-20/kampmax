import type { BadgeVariant } from "@/components/admin/StatusBadge";
import type { VendorPromotionStatus } from "@/types/vendor-promotions";

/** Order used for status pills / default list ordering (priority tiers). */
export const STATUS_ORDER: VendorPromotionStatus[] = ["active", "scheduled", "draft", "paused", "expired", "cancelled"];

export const STATUS_PILLS: { value: VendorPromotionStatus | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "scheduled", label: "Scheduled" },
  { value: "draft", label: "Draft" },
  { value: "paused", label: "Paused" },
  { value: "expired", label: "Expired" },
  { value: "cancelled", label: "Cancelled" },
];

export function promotionStatusVariant(status: VendorPromotionStatus): BadgeVariant {
  switch (status) {
    case "active":
      return "success";
    case "scheduled":
      return "info";
    case "draft":
      return "neutral";
    case "paused":
      return "warning";
    case "expired":
      return "error";
    case "cancelled":
      return "error";
  }
}

export const PROMOTION_SORT_OPTIONS: { value: string; label: string }[] = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "usage", label: "Most redeemed" },
  { value: "ends_soon", label: "Ending soonest" },
];

export function formatPromotionValue(discountType: "percentage" | "fixed_amount", discountValue: number): string {
  return discountType === "percentage" ? `${discountValue}%` : `₦${discountValue.toLocaleString("en-NG")}`;
}
/** What a vendor is told about their promotion's review, or null when approved. */
export function reviewNotice(p: {
  review?: "approved" | "pending" | "rejected";
  reviewNote?: string;
}): { tone: "warning" | "error"; title: string; body: string } | null {
  if (p.review === "pending") {
    return {
      tone: "warning",
      title: "Awaiting approval",
      body: "Customers can't use this code until Kampmax approves it. Any edit sends it back for review.",
    };
  }
  if (p.review === "rejected") {
    return {
      tone: "error",
      title: "Not approved",
      body: p.reviewNote
        ? `${p.reviewNote} Edit the promotion to resubmit it.`
        : "Edit the promotion to resubmit it.",
    };
  }
  return null;
}
