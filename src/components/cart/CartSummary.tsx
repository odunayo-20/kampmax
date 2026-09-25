"use client";

import { Info } from "lucide-react";
import { CartSummary as CartSummaryType } from "@/lib/cart-context";
import { formatNaira } from "@/lib/utils";

interface CartSummaryProps {
  summary: CartSummaryType;
}

export function CartSummary({ summary }: CartSummaryProps) {
  return (
    <div className="bg-white rounded-xl border border-kampmax-border p-4 space-y-3">
      <h3 className="text-sm font-semibold text-kampmax-text">Order Summary</h3>

      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-kampmax-text-secondary">
            Items ({summary.itemCount})
          </span>
          <span className="text-kampmax-text tabular-nums">
            {formatNaira(summary.itemsSubtotal)}
          </span>
        </div>

        {summary.discountTotal > 0 && (
          <div className="flex justify-between">
            <span className="text-kampmax-success">Discount</span>
            <span className="text-kampmax-success tabular-nums">
              -{formatNaira(summary.discountTotal)}
            </span>
          </div>
        )}

        <div className="flex justify-between">
          <span className="text-kampmax-text-secondary">
            Delivery (Hostel)
          </span>
          <span className="text-kampmax-text tabular-nums">
            {summary.deliveryFee === 0
              ? "Free"
              : formatNaira(summary.deliveryFee)}
          </span>
        </div>

        <div className="border-t border-kampmax-border pt-2 flex justify-between">
          <span className="font-semibold text-kampmax-text">Total</span>
          <span className="font-bold text-kampmax-navy text-lg tabular-nums">
            {formatNaira(summary.total)}
          </span>
        </div>
      </div>
    </div>
  );
}
