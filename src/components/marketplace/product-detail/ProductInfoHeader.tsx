"use client";

import Link from "next/link";
import { Star, Check, X, Clock, AlertCircle } from "lucide-react";
import { ConditionBadge } from "@/components/ui";
import { formatNaira, calculateDiscountPercentage } from "@/lib/utils";

interface ProductInfoHeaderProps {
  product: {
    id: string;
    title: string;
    price: number;
    originalPrice?: number;
    rating?: number;
    ratingCount?: number;
    sku?: string;
    condition: string;
    status: string;
    images: string[];
  };
  effectivePrice: number;
  inStock: boolean;
  lowStock: boolean;
  variantStock: number;
  isSold: boolean;
  isRemoved: boolean;
  hasDiscount: boolean;
  discountPct: number;
}

export function ProductInfoHeader({
  product,
  effectivePrice,
  inStock,
  lowStock,
  variantStock,
  isSold,
  isRemoved,
  hasDiscount,
  discountPct,
}: ProductInfoHeaderProps) {
  const isUnavailable = isSold || isRemoved;

  return (
    <div>
      <h1 className="text-[22px] font-bold tracking-tight text-neutral-900 leading-tight lg:text-2xl">{product.title}</h1>
      <div className="flex flex-wrap items-center gap-2 mt-2">
        {product.rating ? (
          <Link href="#reviews" className="flex items-center gap-1.5 group">
            <span className="flex items-center gap-0.5">
              <Star className="h-4 w-4 fill-accent-500 text-accent-500" />
              <span className="text-sm font-semibold text-neutral-900">{product.rating.toFixed(1)}</span>
            </span>
            <span className="text-sm text-neutral-600 group-hover:text-primary-600 group-hover:underline">
              ({product.ratingCount ?? 0} reviews)
            </span>
          </Link>
        ) : null}
      </div>

      <div className="mt-4 flex items-baseline gap-3 flex-wrap">
        <span className="text-[28px] font-extrabold tracking-tight text-primary-900 leading-none">{formatNaira(effectivePrice)}</span>
        {hasDiscount && (
          <>
            <span className="text-sm text-neutral-400 line-through">{formatNaira(product.originalPrice!)}</span>
            <span className="inline-flex items-center rounded-md bg-error-600 text-white text-xs font-bold px-1.5 py-0.5">{discountPct}% OFF</span>
          </>
        )}
      </div>
      {hasDiscount && (
        <p className="text-xs text-success-700 font-medium mt-1">You save {formatNaira(product.originalPrice! - effectivePrice)}</p>
      )}

      <div className="mt-3 flex items-center gap-2 text-sm">
        {isRemoved ? (
          <span className="inline-flex items-center gap-1.5 text-error-700 font-medium">
            <AlertCircle className="h-4 w-4" /> Product unavailable
          </span>
        ) : isSold ? (
          <span className="inline-flex items-center gap-1.5 text-error-700 font-medium">
            <X className="h-4 w-4" /> Sold out
          </span>
        ) : inStock ? (
          lowStock ? (
            <span className="inline-flex items-center gap-1.5 text-amber-700 font-medium">
              <Clock className="h-4 w-4" /> Only {variantStock} left
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-success-700 font-medium">
              <Check className="h-4 w-4" /> In stock · {variantStock} available
            </span>
          )
        ) : (
          <span className="inline-flex items-center gap-1.5 text-error-700 font-medium">
            <X className="h-4 w-4" /> Out of stock for this combination
          </span>
        )}
        {!isUnavailable && <span className="text-neutral-400">·</span>}
        {!isUnavailable && (
          <span className="text-xs text-neutral-500">
            {product.sku ? `SKU: ${product.sku} · ` : ""}
            {product.condition}
          </span>
        )}
      </div>
    </div>
  );
}