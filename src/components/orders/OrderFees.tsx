"use client";

import { Info } from "lucide-react";
import { formatNaira, cn } from "@/lib/utils";

interface OrderFeesProps {
  subtotal: number;
  deliveryFee: number;
  discountAmount: number;
  total: number;
  paymentMethod: string;
  paymentStatus: string;
}

export function OrderFees({
  subtotal,
  deliveryFee,
  discountAmount,
  total,
  paymentMethod,
  paymentStatus,
}: OrderFeesProps) {
  const PAYMENT_LABELS: Record<string, string> = {
    paystack: "Paystack",
    bank_transfer: "Bank Transfer",
    wallet: "Kampmax Wallet",
    cod: "Cash on Pickup",
  };

  const PAYMENT_STATUS_STYLES: Record<string, string> = {
    paid: "text-kampmax-success",
    pending: "text-kampmax-warning",
    failed: "text-kampmax-error",
    refunded: "text-kampmax-info",
  };

  return (
    <div className="space-y-2 text-sm">
      <div className="flex justify-between">
        <span className="text-kampmax-text-secondary">Items subtotal</span>
        <span className="text-kampmax-text tabular-nums">
          {formatNaira(subtotal)}
        </span>
      </div>

      <div className="flex justify-between">
        <span className="text-kampmax-text-secondary">Delivery</span>
        <span
          className={cn(
            "tabular-nums",
            deliveryFee === 0
              ? "text-kampmax-success font-medium"
              : "text-kampmax-text"
          )}
        >
          {deliveryFee === 0 ? "Free" : formatNaira(deliveryFee)}
        </span>
      </div>

      {discountAmount > 0 && (
        <div className="flex justify-between text-kampmax-success">
          <span>Discount</span>
          <span className="tabular-nums font-medium">
            -{formatNaira(discountAmount)}
          </span>
        </div>
      )}

      <div className="border-t border-kampmax-border pt-2 flex justify-between">
        <span className="font-semibold text-kampmax-text">Total</span>
        <span className="font-bold text-kampmax-navy text-base tabular-nums">
          {formatNaira(total)}
        </span>
      </div>

      <div className="flex items-center justify-between pt-1">
        <span className="text-xs text-kampmax-text-secondary">
          {PAYMENT_LABELS[paymentMethod] || paymentMethod}
        </span>
        <span
          className={cn(
            "text-xs font-medium capitalize",
            PAYMENT_STATUS_STYLES[paymentStatus] || "text-kampmax-text-secondary"
          )}
        >
          {paymentStatus === "paid"
            ? "Paid"
            : paymentStatus === "refunded"
              ? "Refunded"
              : paymentStatus === "pending"
                ? "Pending"
                : paymentStatus}
        </span>
      </div>
    </div>
  );
}
