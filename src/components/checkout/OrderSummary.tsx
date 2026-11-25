"use client";

import { ShieldCheck, Truck } from "lucide-react";
import type { CheckoutPricing } from "@/types/checkout";
import { formatNaira } from "@/lib/utils";

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-kampmax-text-secondary">{label}</span>
      <span className="text-kampmax-text font-medium tabular-nums">{value}</span>
    </div>
  );
}

export function OrderSummary({ pricing: p }: { pricing: CheckoutPricing }) {
  return (
    <section
      aria-labelledby="order-summary-title"
      className="bg-white rounded-xl border border-kampmax-border p-4 sm:p-5 space-y-3"
    >
      <h2 id="order-summary-title" className="text-sm font-semibold text-kampmax-text">
        Order Summary
      </h2>

      <div className="space-y-2.5">
        <Row label="Items subtotal" value={formatNaira(p.itemsSubtotal)} />
        <Row label="Delivery fee" value={formatNaira(p.deliveryTotal)} />
        {p.discountTotal > 0 && (
          <Row label="Promo discount" value={`-${formatNaira(p.discountTotal)}`} />
        )}
        <Row label="Total items" value={String(p.itemCount)} />

        <div className="border-t border-kampmax-border pt-3 flex items-center justify-between">
          <span className="text-sm font-semibold text-kampmax-navy">Total</span>
          <span className="text-lg font-bold text-kampmax-navy tabular-nums">
            {formatNaira(p.finalTotal)}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 text-[11px] text-kampmax-text-secondary border-t border-kampmax-border pt-3">
        <ShieldCheck className="w-3.5 h-3.5 text-kampmax-success shrink-0" />
        Amounts are verified at payment — no charge until you confirm.
      </div>

      <div className="flex items-center gap-2 text-[11px] text-kampmax-text-secondary">
        <Truck className="w-3.5 h-3.5 text-kampmax-blue shrink-0" />
        Delivery estimate shown per seller in the items list.
      </div>
    </section>
  );
}
