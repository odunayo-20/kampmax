"use client";

import { use, useMemo } from "react";
import Link from "next/link";
import { ArrowLeft, BadgePercent } from "lucide-react";
import {
  useVendorPromotion,
  useVendorPromotionFormContext,
  useVendorPromotionRedemptions,
} from "@/hooks/use-vendor-promotions";
import { getDefaultVendorPromotionPermissions } from "@/types/vendor-promotions";
import { PromotionOverviewPanel } from "@/components/vendor-promotions/PromotionOverviewPanel";
import { PromotionRedemptionsPanel } from "@/components/vendor-promotions/PromotionRedemptionsPanel";
import { PromotionRowActions } from "@/components/vendor-promotions/PromotionRowActions";
import { PromotionsSkeleton } from "@/components/vendor-promotions/PromotionsSkeleton";

export default function VendorPromotionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const promotionQuery = useVendorPromotion(id);
  const redemptionsQuery = useVendorPromotionRedemptions(id);
  const contextQuery = useVendorPromotionFormContext();
  const permissions = useMemo(() => getDefaultVendorPromotionPermissions(), []);

  if (promotionQuery.isPending) return <PromotionsSkeleton />;

  const promotion = promotionQuery.data;
  const data = promotion
    ? {
        promotion,
        productTitles: (contextQuery.data?.products ?? []).filter((p) => promotion.productIds.includes(p.id)).map((p) => ({ id: p.id, title: p.title })),
        redemptions: redemptionsQuery.data ?? [],
        categoryName: contextQuery.data?.categories.find((c) => c.id === promotion.categoryId)?.name,
      }
    : null;

  if (promotionQuery.isError || !data) {
    return (
      <div className="rounded-xl border border-kampmax-border bg-white p-10 text-center">
        <BadgePercent className="mx-auto mb-3 h-10 w-10 text-kampmax-text-secondary" aria-hidden />
        <p className="text-sm font-medium text-kampmax-text">Promotion not found</p>
        <p className="mt-1 text-xs text-kampmax-text-secondary">This promotion may not belong to your store.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link
          href="/vendor/promotions"
          className="inline-flex items-center gap-1 text-xs font-medium text-kampmax-text-secondary hover:text-kampmax-blue"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
          Back to promotions
        </Link>
        <PromotionRowActions promotion={data.promotion} permissions={permissions} onChanged={() => {}} />
      </div>

      <PromotionOverviewPanel
        promotion={data.promotion}
        productTitles={data.productTitles}
        categoryName={data.categoryName}
      />

      <PromotionRedemptionsPanel redemptions={data.redemptions} />
    </div>
  );
}