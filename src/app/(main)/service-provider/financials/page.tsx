"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { SpFinancialsSubnav } from "@/components/service-provider/financials/SpFinancialsSubnav";
import { WalletWithdrawals } from "@/components/wallet/WalletWithdrawals";
import { WalletActivity } from "@/components/wallet/WalletActivity";

export default function FinancialsOverviewPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-kampmax-text">Financials</h1>
        <p className="mt-1 text-sm text-kampmax-text-secondary">Your wallet balance and recent activity.</p>
      </header>

      <SpFinancialsSubnav />

      <WalletWithdrawals />

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-kampmax-text">Recent transactions</h2>
          <Link
            href="/service-provider/financials/transactions"
            className="inline-flex items-center gap-1 text-sm font-semibold text-primary-600 hover:underline"
          >
            View all <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </Link>
        </div>
        <WalletActivity limit={5} />
      </section>
    </div>
  );
}
