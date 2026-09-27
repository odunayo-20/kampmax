import { apiClient } from "@/lib/api-client";

/** A promo code an admin has featured in a storefront slot. */
export interface FeaturedPromotion {
  id: string;
  name: string;
  description: string;
  code: string;
  discountType: "PERCENTAGE" | "FIXED_AMOUNT";
  discountValue: number;
  minimumOrderAmount: number | null;
  expiresAt: string | null;
}

export type FeaturedPlacement = "homepage_banner" | "deals_page";

export async function fetchFeaturedPromotions(
  placement: FeaturedPlacement,
  campusId?: string
): Promise<FeaturedPromotion[]> {
  const params = new URLSearchParams({ placement });
  if (campusId) params.set("campusId", campusId);
  const { data, error } = await apiClient.get<FeaturedPromotion[]>(
    `/promotions/featured?${params.toString()}`
  );
  if (error) throw new Error(error.message || "Couldn't load promotions.");
  return Array.isArray(data) ? data : [];
}

/** "15% off" / "₦1,500 off". */
export function featuredDiscountLabel(
  p: Pick<FeaturedPromotion, "discountType" | "discountValue">
): string {
  return p.discountType === "PERCENTAGE"
    ? `${p.discountValue}% off`
    : `₦${p.discountValue.toLocaleString("en-NG")} off`;
}

/** "Spend ₦5,000+" or null when there is no minimum. */
export function featuredMinSpendLabel(
  p: Pick<FeaturedPromotion, "minimumOrderAmount">
): string | null {
  return p.minimumOrderAmount
    ? `Spend ₦${p.minimumOrderAmount.toLocaleString("en-NG")}+`
    : null;
}
