"use client";

import Link from "next/link";
import { Package, Star, ExternalLink } from "lucide-react";
import { CartItem } from "@/types";
import { formatNaira, cn } from "@/lib/utils";

interface OrderItemsProps {
  items: CartItem[];
  onReviewItem?: (productId: string, productTitle: string) => void;
  isItemReviewed?: (productId: string) => boolean;
  canReview?: boolean;
}

export function OrderItems({
  items,
  onReviewItem,
  isItemReviewed,
  canReview = false,
}: OrderItemsProps) {
  return (
    <div className="space-y-3">
      {items.map((item, idx) => {
        const unitPrice = item.unitPrice ?? item.product.price;
        const lineTotal = unitPrice * item.quantity;
        const variantLabel =
          item.variantLabel ||
          (item.selectedVariation
            ? `${item.selectedVariation.name}: ${item.selectedVariation.option}`
            : undefined) ||
          (item.selectedVariants
            ? Object.entries(item.selectedVariants)
                .map(([k, v]) => `${k}: ${v}`)
                .join(" · ")
            : undefined);

        const reviewed = isItemReviewed ? isItemReviewed(item.product.id) : false;

        return (
          <div
            key={item.product.id}
            className={cn(
              "flex items-start gap-3",
              idx < items.length - 1 && "pb-3 border-b border-kampmax-border"
            )}
          >
            {/* Clickable thumbnail */}
            <Link
              href={`/marketplace/${item.product.id}`}
              className="w-14 h-14 bg-kampmax-muted rounded-lg flex items-center justify-center shrink-0 hover:opacity-85 transition-opacity overflow-hidden"
              title="View product details"
            >
              {item.product.images?.[0] ? (
                <img
                  src={item.product.images[0]}
                  alt={item.product.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <Package className="w-6 h-6 text-kampmax-text-secondary/40" />
              )}
            </Link>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <Link
                href={`/marketplace/${item.product.id}`}
                className="text-sm font-semibold text-kampmax-text hover:text-kampmax-blue transition-colors line-clamp-1"
                title="View product details"
              >
                {item.product.title}
              </Link>

              {/* Variant info */}
              {variantLabel && (
                <div className="mt-0.5">
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
                    {variantLabel}
                  </span>
                </div>
              )}

              {/* Quantity, price, and actions */}
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1 text-xs text-kampmax-text-secondary">
                <span>Qty: {item.quantity}</span>
                <span className="text-[10px] text-kampmax-text-secondary/50">·</span>
                <span>{formatNaira(unitPrice)} each</span>

                <span className="text-[10px] text-kampmax-text-secondary/50">·</span>
                <Link
                  href={`/marketplace/${item.product.id}`}
                  className="text-kampmax-blue hover:underline inline-flex items-center gap-0.5 font-medium"
                >
                  Details
                  <ExternalLink className="w-3 h-3" />
                </Link>

                {canReview && onReviewItem && (
                  <>
                    <span className="text-[10px] text-kampmax-text-secondary/50">·</span>
                    {reviewed ? (
                      <span className="inline-flex items-center gap-0.5 text-green-700 font-medium">
                        <Star className="w-3 h-3 fill-current" />
                        Reviewed
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onReviewItem(item.product.id, item.product.title)}
                        className="text-amber-600 hover:text-amber-700 hover:underline inline-flex items-center gap-0.5 font-medium"
                      >
                        <Star className="w-3 h-3" />
                        Review Item
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Total */}
            <span className="text-sm font-semibold text-kampmax-navy shrink-0 tabular-nums pt-0.5">
              {formatNaira(lineTotal)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
