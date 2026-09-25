"use client";

import { Loader2, ChevronDown, ShieldCheck, Truck, RotateCcw } from "lucide-react";
import { CheckoutSession } from "@/types/checkout";
import { formatNaira } from "@/lib/utils";
import { Button } from "@/components/atoms/Button";

interface OrderSummaryProps {
  session: CheckoutSession;
  loading?: boolean;
  errorMessage?: string | null;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  onRefresh?: () => void;
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-kampmax-text-secondary">{label}</span>
      <span className="text-kampmax-text font-medium tabular-nums">{value}</span>
    </div>
  );
}

export function OrderSummary({
  session,
  loading,
  errorMessage,
  collapsed = false,
  onToggleCollapse,
  onRefresh,
}: OrderSummaryProps) {
  const p = session.pricing;

  return (
    <section
      aria-labelledby="order-summary-title"
      className="bg-white rounded-xl border border-kampmax-border p-4 sm:p-5 space-y-3"
    >
      <div className="flex items-center justify-between">
        <h2
          id="order-summary-title"
          className="text-sm font-semibold text-kampmax-text"
        >
          Order Summary
        </h2>
        {onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            aria-label={collapsed ? "Expand order summary" : "Collapse order summary"}
            className="p-1 rounded-md text-kampmax-text-secondary hover:bg-neutral-100 md:hidden"
          >
            <ChevronDown
              className={`h-5 w-5 transition-transform ${collapsed ? "-rotate-90" : "rotate-0"}`}
            />
          </button>
        )}
      </div>

      {!collapsed && (
        <div className="space-y-2.5">
          <p className="text-xs text-kampmax-text-secondary">
            Display-only summary. The server is authoritative for all amounts.
          </p>

          <Row label="Items subtotal" value={formatNaira(p.itemsSubtotal)} />
          <Row label="Delivery fee" value={formatNaira(p.deliveryTotal)} />
          {p.discountTotal > 0 && (
            <Row label="Promo discount" value={`-${formatNaira(p.discountTotal)}`} />
          )}
          {p.coinDeduction > 0 && (
            <Row label="Kampmax coin" value={`-${formatNaira(p.coinDeduction)}`} />
          )}
          <Row label="Total items" value={String(p.itemCount)} />

          <div className="border-t border-kampmax-border pt-3 flex items-center justify-between">
            <span className="text-sm font-semibold text-kampmax-navy">
              Total
            </span>
            <span className="text-lg font-bold text-kampmax-navy tabular-nums">
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin text-kampmax-text-secondary" />
              ) : (
                formatNaira(p.finalTotal)
              )}
            </span>
          </div>
        </div>
      )}

      {!collapsed && onRefresh && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onRefresh}
          className="w-full inline-flex items-center gap-1.5"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Refresh total
        </Button>
      )}

      {errorMessage && (
        <p className="text-xs text-kampmax-error" role="alert">
          {errorMessage}
        </p>
      )}

      <div className="flex items-center gap-2 text-[11px] text-kampmax-text-secondary border-t border-kampmax-border pt-3">
        <ShieldCheck className="w-3.5 h-3.5 text-kampmax-success shrink-0" />
        Amounts are verified at payment — no charge until you confirm.
      </div>

      <div className="flex items-center gap-2 text-[11px] text-kampmax-text-secondary">
        <Truck className="w-3.5 h-3.5 text-kampmax-blue shrink-0" />
        Delivery estimate shown per vendor in the items list.
      </div>
    </section>
  );
}
