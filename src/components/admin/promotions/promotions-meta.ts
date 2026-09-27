import {
  BadgePercent,
  Banknote,
  GraduationCap,
  Store,
  Star,
  Ticket,
  type LucideIcon,
} from "lucide-react";
import type { BadgeVariant } from "@/components/admin/StatusBadge";
import type {
  ManagedPromotionStatus,
  PromotionReview,
  ManagedPromotionType,
  PromotionEligibility,
  PromotionPlacement,
} from "@/types/admin";

export const PROMOTION_TYPE_LABELS: Record<ManagedPromotionType, string> = {
  percentage_discount: "Percentage code",
  fixed_discount: "Fixed-amount code",
  promo_code: "Promo code",
  featured_product: "Featured product",
  featured_vendor: "Featured vendor",
  campus_promotion: "Campus campaign",
};

export function promotionTypeLabel(type: ManagedPromotionType): string {
  return PROMOTION_TYPE_LABELS[type] ?? type;
}

export const PROMOTION_TYPE_ICONS: Record<ManagedPromotionType, LucideIcon> = {
  percentage_discount: BadgePercent,
  fixed_discount: Banknote,
  promo_code: Ticket,
  featured_product: Star,
  featured_vendor: Store,
  campus_promotion: GraduationCap,
};

const TYPE_VARIANTS: Record<ManagedPromotionType, BadgeVariant> = {
  percentage_discount: "blue",
  fixed_discount: "gold",
  promo_code: "info",
  featured_product: "gold",
  featured_vendor: "success",
  campus_promotion: "info",
};

export function promotionTypeBadgeVariant(
  type: ManagedPromotionType
): BadgeVariant {
  return TYPE_VARIANTS[type] ?? "neutral";
}

export const PROMOTION_STATUS_LABELS: Record<ManagedPromotionStatus, string> = {
  draft: "Draft",
  scheduled: "Scheduled",
  active: "Active",
  paused: "Paused",
  ended: "Ended",
};

export function promotionStatusLabel(status: ManagedPromotionStatus): string {
  return PROMOTION_STATUS_LABELS[status] ?? status;
}

export function promotionStatusBadgeVariant(
  status: ManagedPromotionStatus
): BadgeVariant {
  switch (status) {
    case "active":
      return "success";
    case "scheduled":
      return "info";
    case "paused":
      return "warning";
    default:
      return "neutral"; // draft, ended
  }
}

export const PROMOTION_PLACEMENT_LABELS: Record<PromotionPlacement, string> = {
  homepage_banner: "Homepage banner",
  deals_page: "Deals page",
  category_strip: "Category strip",
  search_boost: "Search boost",
  none: "No placement",
};

export const PROMOTION_ELIGIBILITY_LABELS: Record<PromotionEligibility, string> = {
  all_customers: "Everyone",
  new_customers: "New to the store",
  returning_customers: "Returning customers",
};

export function promotionPlacementLabel(placement: PromotionPlacement): string {
  return PROMOTION_PLACEMENT_LABELS[placement] ?? placement;
}

/** "-25%" / "-N1,500" / "15% w/ code" / "Feature slot". */
export function discountLabel(promotion: {
  type: ManagedPromotionType;
  discountValue: number | null;
}): string {
  switch (promotion.type) {
    case "percentage_discount":
      return `${promotion.discountValue ?? 0}% off`;
    case "fixed_discount":
      return `N${(promotion.discountValue ?? 0).toLocaleString("en-NG")} off`;
    case "promo_code":
      // Promo codes are percent-based in this prototype.
      return promotion.discountValue == null
        ? "Code perk"
        : `${promotion.discountValue}% w/ code`;
    case "featured_product":
      return "Featured product";
    case "featured_vendor":
      return "Featured vendors";
    case "campus_promotion":
      return "Campus campaign";
    default:
      return "Feature slot";
  }
}

/** The promotion types the platform supports (a bare "promo code" is one of the two codes). */
export const PROMOTION_TYPE_FILTER_ORDER: ManagedPromotionType[] = [
  "percentage_discount",
  "fixed_discount",
  "featured_product",
  "featured_vendor",
  "campus_promotion",
];

export const PROMOTION_STATUS_FILTER_ORDER: ManagedPromotionStatus[] = [
  "draft",
  "scheduled",
  "active",
  "paused",
  "ended",
];

/** "1.2%" - clicks as a share of views, or null before anything was shown. */
export function clickRate(views: number, clicks: number): string | null {
  if (views <= 0) return null;
  return `${((clicks / views) * 100).toFixed(1)}%`;
}

/** What the "usage" column shows: redemptions for a code, reach for a slot. */
export function promotionUsageLabel(p: {
  type: ManagedPromotionType;
  usageCount: number;
  usageLimit: number | null;
  views?: number;
  clicks?: number;
}): string {
  if (
    p.type === "featured_product" ||
    p.type === "featured_vendor" ||
    p.type === "campus_promotion"
  ) {
    return `${p.views ?? 0} views · ${p.clicks ?? 0} clicks`;
  }
  return `${p.usageCount}${p.usageLimit != null ? ` / ${p.usageLimit}` : ""}`;
}

/** Badge text for a vendor promotion's review state, or null when nothing needs saying. */
export function reviewBadge(
  review: PromotionReview | undefined
): { label: string; variant: BadgeVariant } | null {
  if (review === "pending") return { label: "Needs review", variant: "warning" };
  if (review === "rejected") return { label: "Rejected", variant: "error" };
  return null;
}
