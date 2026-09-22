"use client";

import { useState } from "react";
import { Tag, X, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { CouponState } from "@/types/checkout";
import { couponStatusLabel } from "@/services/checkout";
import { formatNaira } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface CouponSectionProps {
  coupon: CouponState;
  onApply: (code: string) => void;
  onRemove: () => void;
  enabled: boolean;
}

export function CouponSection({
  coupon,
  onApply,
  onRemove,
  enabled,
}: CouponSectionProps) {
  const [input, setInput] = useState(coupon.code);
  const isApplied = coupon.status === "valid";
  const isLoading = coupon.status === "loading";

  if (isApplied && coupon.appliedDiscount !== undefined) {
    return (
      <section className="bg-white rounded-xl border border-kampmax-border p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-full bg-kampmax-success/10 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-4 h-4 text-kampmax-success" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-kampmax-text uppercase">
                {coupon.code}
              </p>
              <p className="text-xs text-kampmax-text-secondary">
                -{formatNaira(coupon.appliedDiscount)} applied
              </p>
            </div>
          </div>
          <button
            onClick={onRemove}
            aria-label="Remove promo code"
            className="p-1.5 rounded-full hover:bg-kampmax-error/10 text-kampmax-text-secondary hover:text-kampmax-error transition-colors shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </section>
    );
  }

  return (
    <section
      aria-labelledby="coupon-title"
      className="bg-white rounded-xl border border-kampmax-border p-4 sm:p-5 space-y-3"
    >
      <h2
        id="coupon-title"
        className="text-sm font-semibold text-kampmax-text flex items-center gap-2"
      >
        <Tag className="h-4 w-4 text-kampmax-blue" />
        Promo Code
      </h2>

      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value.toUpperCase())}
          onKeyDown={(e) => e.key === "Enter" && enabled && onApply(input.trim())}
          placeholder="Enter promo code"
          aria-label="Promo code"
          disabled={!enabled}
          className={cn(
            "flex-1 h-10 px-3 text-sm font-mono uppercase border rounded-lg focus:outline-none focus:ring-1 transition-colors",
            coupon.status === "invalid"
              ? "border-kampmax-error focus:border-kampmax-error focus:ring-kampmax-error"
              : "border-kampmax-border focus:border-kampmax-blue focus:ring-kampmax-blue",
            !enabled && "opacity-60"
          )}
        />
        <button
          onClick={() => onApply(input.trim())}
          disabled={isLoading || !input.trim() || !enabled}
          className="h-10 px-4 text-sm font-medium bg-kampmax-navy text-white rounded-lg hover:bg-kampmax-navy-light disabled:opacity-50 disabled:cursor-not-allowed transition-colors inline-flex items-center gap-2"
        >
          {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
          Apply
        </button>
      </div>


      {enabled && !isApplied && coupon.status !== "idle" && coupon.status !== "loading" && (
        <p
          role={coupon.status === "invalid" ? "alert" : "status"}
          className={cn(
            "text-xs flex items-center gap-1",
            coupon.status === "invalid" ? "text-kampmax-error" : "text-kampmax-text-secondary"
          )}
        >
          {coupon.status === "invalid" ? (
            <AlertCircle className="w-3 h-3" />
          ) : (
            <CheckCircle2 className="w-3 h-3" />
          )}
          {couponStatusLabel(coupon.status)}
        </p>
      )}
    </section>
  );
}
