"use client";

import Link from "next/link";
import { CalendarDays, ChevronRight, ShoppingBag } from "lucide-react";
import { formatDate, formatNaira } from "@/lib/utils";
import { VENDOR_PROMOTION_SCOPE_LABELS } from "@/types/vendor-promotions";
import type { VendorPromotion, VendorPromotionPermissions } from "@/types/vendor-promotions";
import { PromotionStatusBadge } from "./PromotionStatusBadge";
import { PromotionReviewBadge } from "./PromotionReviewBadge";
import { PromotionRowActions } from "./PromotionRowActions";
import { formatPromotionValue } from "./promotions-meta";

interface PromotionsGridProps {
  promotions: VendorPromotion[];
  permissions: VendorPromotionPermissions;
  onChanged: () => void;
}

export function PromotionsGrid({ promotions, permissions, onChanged }: PromotionsGridProps) {
  if (promotions.length === 0) {
    return (
      <div className="rounded-xl border border-kampmax-border bg-white p-10 text-center">
        <ShoppingBag className="mx-auto h-8 w-8 text-kampmax-text-secondary/40" aria-hidden />
        <p className="mt-2 text-sm font-medium text-kampmax-text">No promotions found</p>
        <p className="mt-0.5 text-xs text-kampmax-text-secondary">Try changing your filters or create a new promotion.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {promotions.map((promotion) => (
        <div key={promotion.id} className="rounded-xl border border-kampmax-border bg-white p-4">
          <div className="flex items-start justify-between gap-2">
            <Link href={`/vendor/promotions/${promotion.id}`} className="min-w-0">
              <p className="truncate text-sm font-semibold text-kampmax-text hover:text-kampmax-blue">{promotion.title}</p>
              <p className="text-[10px] text-kampmax-text-secondary">{promotion.id}</p>
            </Link>
            <div className="flex shrink-0 items-center gap-1">
              <PromotionStatusBadge status={promotion.status} />
              <PromotionReviewBadge review={promotion.review} />
              <PromotionRowActions promotion={promotion} permissions={permissions} onChanged={onChanged} />
            </div>
          </div>

          <div className="mt-3 flex items-end justify-between gap-2">
            <div>
              <p className="text-lg font-bold text-kampmax-text">{formatPromotionValue(promotion.discountType, promotion.discountValue)}</p>
              <p className="text-xs text-kampmax-text-secondary">{VENDOR_PROMOTION_SCOPE_LABELS[promotion.scope]}</p>
            </div>
            <div className="text-right">
              <p className="text-xs font-semibold text-kampmax-text">{promotion.usageCount} redeemed</p>
              {promotion.maxDiscountAmount !== undefined && (
                <p className="text-[10px] text-kampmax-text-secondary">up to {formatNaira(promotion.maxDiscountAmount)}</p>
              )}
            </div>
          </div>

          <p className="mt-3 flex items-center gap-1 text-[11px] text-kampmax-text-secondary">
            <CalendarDays className="h-3.5 w-3.5" aria-hidden />
            {formatDate(promotion.startsAt)} → {formatDate(promotion.endsAt)}
          </p>

          <Link
            href={`/vendor/promotions/${promotion.id}`}
            className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-kampmax-blue hover:underline"
          >
            View details
            <ChevronRight className="h-3.5 w-3.5" aria-hidden />
          </Link>
        </div>
      ))}
    </div>
  );
}