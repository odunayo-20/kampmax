"use client";

import Link from "next/link";
import { Wallet, ArrowUpRight, Clock } from "lucide-react";
import { formatNaira } from "@/lib/utils";
import type { FreelancerEarningsSummary } from "@/types/freelancer-dashboard";

// Dashboard widget: the real wallet balance, or nothing when it can't be read.
// The figures come from the dashboard overview, so this adds no request of its own.
export function FreelancerFinancialSummary({
  earnings,
}: {
  earnings: FreelancerEarningsSummary | null;
}) {
  if (!earnings) return null;

  return (
    <Link
      href="/freelancer/earnings"
      className="group block rounded-xl border border-kampmax-border bg-white p-5 transition-shadow hover:shadow-md"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-100 text-primary-600">
            <Wallet className="h-5 w-5" aria-hidden />
          </div>
          <h2 className="text-sm font-bold text-kampmax-text">Earnings</h2>
        </div>
        <ArrowUpRight className="h-4 w-4 text-kampmax-text-secondary group-hover:text-primary-600" aria-hidden />
      </div>

      <p className="mt-4 text-2xl font-bold text-kampmax-text">{formatNaira(earnings.available)}</p>
      <p className="text-xs text-kampmax-text-secondary">Available balance</p>

      <p className="mt-3 flex items-center justify-between text-sm text-kampmax-text-secondary">
        <span className="flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5" aria-hidden /> Pending
        </span>
        <span className="font-medium text-kampmax-text">{formatNaira(earnings.pending)}</span>
      </p>
    </Link>
  );
}
