"use client";

import { Check, Loader2, ShieldCheck, AlertCircle } from "lucide-react";
import type { CheckoutPhase } from "@/types/checkout";
import { cn } from "@/lib/utils";

interface PlaceOrderButtonProps {
  phase: CheckoutPhase;
  disabled?: boolean;
  onClick: () => void;
}

const BUSY_LABELS: Partial<Record<CheckoutPhase, string>> = {
  placing: "Placing your order…",
  paying: "Contacting secure payment…",
  leaving: "Taking you there…",
};

export function PlaceOrderButton({ phase, disabled, onClick }: PlaceOrderButtonProps) {
  const busyLabel = BUSY_LABELS[phase];
  const failed = phase === "failed";

  return (
    <div className="space-y-2">
      <button
        onClick={onClick}
        disabled={disabled || !!busyLabel}
        className={cn(
          "w-full h-12 px-6 rounded-xl text-base font-bold transition-colors",
          "inline-flex items-center justify-center gap-2",
          failed
            ? "bg-kampmax-error text-white hover:bg-kampmax-error/90"
            : "bg-kampmax-navy text-white hover:bg-kampmax-navy-light",
          (disabled || busyLabel) && "opacity-70 cursor-not-allowed"
        )}
      >
        {busyLabel ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" />
            {busyLabel}
          </>
        ) : failed ? (
          <>
            <AlertCircle className="h-5 w-5" />
            Try again
          </>
        ) : (
          <>
            <ShieldCheck className="h-5 w-5" />
            Place order securely
          </>
        )}
      </button>

      {!busyLabel && !failed && (
        <p className="text-[11px] text-center text-kampmax-text-secondary flex items-center justify-center gap-1">
          <Check className="w-3 h-3 text-kampmax-success" />
          You&apos;ll confirm the total before you&apos;re charged.
        </p>
      )}
    </div>
  );
}
