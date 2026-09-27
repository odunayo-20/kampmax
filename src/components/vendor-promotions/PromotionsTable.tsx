"use client";

import Link from "next/link";
import { CalendarDays, ShoppingBag } from "lucide-react";
import { formatDate, formatNaira } from "@/lib/utils";
import { VENDOR_PROMOTION_SCOPE_LABELS } from "@/types/vendor-promotions";
import type { VendorPromotion, VendorPromotionPermissions } from "@/types/vendor-promotions";
import { PromotionStatusBadge } from "./PromotionStatusBadge";
import { PromotionReviewBadge } from "./PromotionReviewBadge";
import { PromotionRowActions } from "./PromotionRowActions";
import { formatPromotionValue } from "./promotions-meta";

interface PromotionsTableProps {
  promotions: VendorPromotion[];
  permissions: VendorPromotionPermissions;
  onChanged: () => void;
}

export function PromotionsTable({ promotions, permissions, onChanged }: PromotionsTableProps) {
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
    <div className="overflow-x-auto rounded-xl border border-kampmax-border bg-white">
      <table className="w-full min-w-[760px] text-left text-sm">
        <thead>
          <tr className="border-b border-kampmax-border text-[10px] uppercase tracking-wide text-kampmax-text-secondary">
            <th className="px-4 py-2.5 font-medium">Promotion</th>
            <th className="px-4 py-2.5 font-medium">Discount</th>
            <th className="px-4 py-2.5 font-medium">Scope</th>
            <th className="px-4 py-2.5 font-medium">Schedule</th>
            <th className="px-4 py-2.5 text-center font-medium">Redeemed</th>
            <th className="px-4 py-2.5 font-medium">Status</th>
            <th className="px-4 py-2.5" aria-label="Actions" />
          </tr>
        </thead>
        <tbody>
          {promotions.map((promotion) => (
            <tr key={promotion.id} className="border-b border-kampmax-border/60 last:border-b-0 hover:bg-kampmax-muted/20">
              <td className="px-4 py-3">
                <Link href={`/vendor/promotions/${promotion.id}`} className="block max-w-[240px]">
                  <span className="block truncate font-medium text-kampmax-text hover:text-kampmax-blue">{promotion.title}</span>
                  <span className="block truncate text-xs text-kampmax-text-secondary">{promotion.id}</span>
                </Link>
              </td>
              <td className="whitespace-nowrap px-4 py-3">
                <span className="font-semibold text-kampmax-text">{formatPromotionValue(promotion.discountType, promotion.discountValue)}</span>
                {promotion.maxDiscountAmount !== undefined && (
                  <span className="block text-[10px] text-kampmax-text-secondary">up to {formatNaira(promotion.maxDiscountAmount)}</span>
                )}
              </td>
              <td className="px-4 py-3 text-kampmax-text-secondary">{VENDOR_PROMOTION_SCOPE_LABELS[promotion.scope]}</td>
              <td className="whitespace-nowrap px-4 py-3">
                <span className="flex items-center gap-1 text-kampmax-text-secondary">
                  <CalendarDays className="h-3.5 w-3.5" aria-hidden />
                  {formatDate(promotion.startsAt)}
                </span>
                <span className="text-[10px] text-kampmax-text-secondary">→ {formatDate(promotion.endsAt)}</span>
              </td>
              <td className="px-4 py-3 text-center">
                <span className="font-semibold text-kampmax-text">{promotion.usageCount}</span>
              </td>
              <td className="px-4 py-3">
                <div className="flex flex-wrap items-center gap-1">
                  <PromotionStatusBadge status={promotion.status} />
                  <PromotionReviewBadge review={promotion.review} />
                </div>
              </td>
              <td className="px-4 py-3">
                <PromotionRowActions promotion={promotion} permissions={permissions} onChanged={onChanged} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}