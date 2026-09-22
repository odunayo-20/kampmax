"use client";

import { CheckCircle2, Clock, RefreshCw, Wallet, AlertCircle } from "lucide-react";
import { formatNaira } from "@/lib/utils";

export interface RefundStatusCardProps {
  status: "pending" | "approved" | "processed" | "rejected";
  amount: number;
  reason?: string;
  payoutMethod?: "kampmax_wallet" | "original_payment";
  dateRequested?: string;
}

export function RefundStatusCard({
  status,
  amount,
  reason,
  payoutMethod = "kampmax_wallet",
  dateRequested = "Today",
}: RefundStatusCardProps) {
  const statusConfig = {
    pending: {
      label: "Refund Under Review",
      color: "bg-amber-50 border-amber-200 text-amber-900",
      badgeColor: "bg-amber-200 text-amber-900",
      icon: Clock,
      desc: "Our Trust & Safety team is reviewing your refund request.",
    },
    approved: {
      label: "Refund Approved",
      color: "bg-blue-50 border-blue-200 text-blue-900",
      badgeColor: "bg-blue-200 text-blue-900",
      icon: RefreshCw,
      desc: "Refund approved! Funds are being processed to your account.",
    },
    processed: {
      label: "Refund Credited",
      color: "bg-emerald-50 border-emerald-200 text-emerald-900",
      badgeColor: "bg-emerald-200 text-emerald-900",
      icon: CheckCircle2,
      desc: `Funds have been successfully refunded to your ${
        payoutMethod === "kampmax_wallet" ? "Kampmax Wallet" : "Original Payment Account"
      }.`,
    },
    rejected: {
      label: "Refund Request Declined",
      color: "bg-rose-50 border-rose-200 text-rose-900",
      badgeColor: "bg-rose-200 text-rose-900",
      icon: AlertCircle,
      desc: "Claim reviewed and declined. Reason: Order fulfilled according to seller guarantee.",
    },
  };

  const current = statusConfig[status];
  const Icon = current.icon;

  return (
    <div className={`p-4 rounded-2xl border ${current.color} space-y-3`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-white/60 shadow-xs">
            <Icon className="w-4 h-4" />
          </div>
          <span className="text-xs font-bold uppercase tracking-wider">{current.label}</span>
        </div>
        <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${current.badgeColor}`}>
          {formatNaira(amount)}
        </span>
      </div>

      <p className="text-xs leading-relaxed opacity-90">{current.desc}</p>

      {reason && (
        <div className="pt-2 border-t border-black/5 text-[11px]">
          <span className="font-semibold">Request Reason:</span> {reason}
        </div>
      )}

      <div className="flex items-center justify-between text-[11px] pt-1 opacity-80">
        <span className="flex items-center gap-1">
          <Wallet className="w-3.5 h-3.5" />
          Payout to: {payoutMethod === "kampmax_wallet" ? "Kampmax Student Wallet" : "Card / Transfer"}
        </span>
        <span>Requested: {dateRequested}</span>
      </div>
    </div>
  );
}
