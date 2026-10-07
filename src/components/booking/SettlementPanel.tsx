"use client";

import { BadgeDollarSign, ShieldCheck, Wallet } from "lucide-react";
import type { ServiceBooking } from "@/types/booking";

/**
 * Where the money is, and what the provider receives. A backend projection:
 * this panel only shows it.
 */
export function SettlementPanel({ booking }: { booking: ServiceBooking }) {
  const f = booking.fulfillment;
  const s = f.settlement;

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-neutral-200 bg-white p-3.5 text-xs">
        <p className="flex items-start gap-2 text-neutral-700">
          <Wallet className="mt-0.5 h-4 w-4 shrink-0 text-primary-600" aria-hidden />
          <span>
            <span className="block font-semibold text-neutral-900">Payment</span>
            <span className="mt-0.5 block text-neutral-600">{f.payment.label}</span>
          </span>
        </p>
        <p className="mt-3 flex items-start gap-2 border-t border-neutral-100 pt-3 text-neutral-700">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-success-600" aria-hidden />
          <span>
            <span className="block font-semibold text-neutral-900">Escrow</span>
            <span className="mt-0.5 block text-neutral-600">{f.escrow.label}</span>
          </span>
        </p>
      </div>

      {s && (
        <div className="rounded-xl border border-neutral-200 bg-white p-3.5">
          <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-neutral-400">
            <BadgeDollarSign className="h-3.5 w-3.5" aria-hidden />
            Payout
          </p>
          <dl className="mt-2 space-y-1.5 text-xs">
            <div className="flex items-center justify-between text-neutral-600">
              <dt>Service amount ({s.currency})</dt>
              <dd className="font-semibold text-neutral-900">{s.serviceAmount.toLocaleString("en-NG")}</dd>
            </div>
            <div className="flex items-center justify-between text-neutral-600">
              <dt>
                Platform fee ({s.platformFeeRate * 100}%){s.feeLabel !== "Standard platform fee" ? ` · ${s.feeLabel}` : ""}
              </dt>
              <dd className="font-semibold text-neutral-900">−{s.platformFee.toLocaleString("en-NG")}</dd>
            </div>
            {s.tax > 0 && (
              <div className="flex items-center justify-between text-neutral-600">
                <dt>Tax</dt>
                <dd className="font-semibold text-neutral-900">−{s.tax.toLocaleString("en-NG")}</dd>
              </div>
            )}
            <div className="flex items-center justify-between border-t border-neutral-100 pt-1.5">
              <dt className="font-bold text-neutral-900">Provider earnings</dt>
              <dd className="text-sm font-bold text-success-700">₦{s.providerEarnings.toLocaleString("en-NG")}</dd>
            </div>
          </dl>
          <p className="mt-2 text-[10px] leading-relaxed text-neutral-400">{s.disclaimer}</p>
        </div>
      )}
    </div>
  );
}