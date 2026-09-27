"use client";

import { StatusBadge } from "@/components/admin/StatusBadge";
import type { VendorPromotionReview } from "@/types/vendor-promotions";

/** Shown next to a promotion's status while it waits on, or failed, review. */
export function PromotionReviewBadge({ review }: { review?: VendorPromotionReview }) {
  if (review === "pending") return <StatusBadge variant="warning" label="Awaiting approval" />;
  if (review === "rejected") return <StatusBadge variant="error" label="Not approved" />;
  return null;
}
