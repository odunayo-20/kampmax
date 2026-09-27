"use client";

import Link from "next/link";
import { CalendarDays, Layers, Package, Users } from "lucide-react";
import { formatDate, formatNaira } from "@/lib/utils";
import { VENDOR_PROMOTION_DISCOUNT_LABELS, VENDOR_PROMOTION_ELIGIBILITY_LABELS } from "@/types/vendor-promotions";
import type { VendorPromotion } from "@/types/vendor-promotions";
import { PromotionStatusBadge } from "./PromotionStatusBadge";
import { PromotionReviewBadge } from "./PromotionReviewBadge";
import { reviewNotice } from "./promotions-meta";

interface PromotionOverviewPanelProps {
  promotion: VendorPromotion;
  productTitles: { id: string; title: string }[];
  categoryName?: string;
}

export function PromotionOverviewPanel({ promotion, productTitles, categoryName }: PromotionOverviewPanelProps) {
  const discountLabel =
    promotion.discountType === "percentage"
      ? promotion.maxDiscountAmount !== undefined
        ? `${promotion.discountValue}% (up to ${formatNaira(promotion.maxDiscountAmount)})`
        : `${promotion.discountValue}% off`
      : `${formatNaira(promotion.discountValue)} off`;

  return (
    <section className="rounded-xl border border-kampmax-border bg-white p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-xl font-bold text-kampmax-text">{promotion.title}</h2>
          <p className="mt-0.5 text-xs text-kampmax-text-secondary">{promotion.id}</p>
        </div>
        <div className="flex items-center gap-1">
          <PromotionStatusBadge status={promotion.status} />
          <PromotionReviewBadge review={promotion.review} />
        </div>
      </div>

      {(() => {
        const notice = reviewNotice(promotion);
        if (!notice) return null;
        return (
          <div
            role="status"
            className={
              notice.tone === "error"
                ? "mt-3 rounded-lg border border-kampmax-error/30 bg-kampmax-error/10 px-3 py-2 text-sm text-red-700"
                : "mt-3 rounded-lg border border-kampmax-warning/40 bg-kampmax-warning/10 px-3 py-2 text-sm text-amber-800"
            }
          >
            <p className="font-medium">{notice.title}</p>
            <p className="mt-0.5 text-xs">{notice.body}</p>
          </div>
        );
      })()}

      {promotion.description && (
        <p className="mt-3 text-sm text-kampmax-text-secondary">{promotion.description}</p>
      )}

      {promotion.categoryId && (
        <div className="mt-4">
          <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wide text-kampmax-text-secondary">Applied to category</p>
          {categoryName ? (
            <p className="text-sm font-medium text-kampmax-text">{categoryName}</p>
          ) : (
            <p className="text-sm text-kampmax-text-secondary">{promotion.categoryId}</p>
          )}
        </div>
      )}

      {productTitles.length > 0 && (
        <div className="mt-4">
          <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wide text-kampmax-text-secondary">Applied to products</p>
          <ul className="space-y-1">
            {productTitles.map((product) => (
              <li key={product.id}>
                <Link href={`/vendor/products/${product.id}`} className="text-sm font-medium text-kampmax-blue hover:underline">
                  {product.title}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Fact icon={Layers} label="Discount" value={discountLabel} />
        <Fact icon={Users} label="Eligibility" value={VENDOR_PROMOTION_ELIGIBILITY_LABELS[promotion.eligibility]} />
        <Fact icon={CalendarDays} label="Runs" value={`${formatDate(promotion.startsAt)} → ${formatDate(promotion.endsAt)}`} />
        <Fact
          icon={Package}
          label="Usage"
          value={
            promotion.usageLimit !== undefined
              ? `${promotion.usageCount} / ${promotion.usageLimit}`
              : `${promotion.usageCount} redeemed`
          }
        />
      </div>

      <div className="mt-4 border-t border-kampmax-border pt-4">
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-kampmax-text-secondary">Details</h3>
        <dl className="grid gap-2 text-sm sm:grid-cols-2">
          <Detail label="Discount type" value={VENDOR_PROMOTION_DISCOUNT_LABELS[promotion.discountType]} />
          <Detail label="Per-customer limit" value={promotion.perCustomerLimit !== undefined ? String(promotion.perCustomerLimit) : "No limit"} />
          {promotion.minOrderAmount !== undefined && (
            <Detail label="Minimum order" value={formatNaira(promotion.minOrderAmount)} />
          )}
          <Detail label="Stackable" value={promotion.stackable ? "Yes" : "No"} />
          {promotion.pausedAt && <Detail label="Paused at" value={formatDate(promotion.pausedAt)} />}
          {promotion.cancelledAt && <Detail label="Cancelled at" value={formatDate(promotion.cancelledAt)} />}
        </dl>
      </div>
    </section>
  );
}

function Fact({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="rounded-lg bg-kampmax-muted/40 p-3">
      <Icon className="mb-1.5 h-4 w-4 text-kampmax-blue" aria-hidden />
      <p className="text-[10px] text-kampmax-text-secondary">{label}</p>
      <p className="mt-0.5 text-sm font-semibold text-kampmax-text">{value}</p>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-lg bg-kampmax-muted/30 px-3 py-2">
      <dt className="text-xs text-kampmax-text-secondary">{label}</dt>
      <dd className="text-xs font-semibold text-kampmax-text">{value}</dd>
    </div>
  );
}