"use client";

import { SpFinancialsSubnav } from "@/components/service-provider/financials/SpFinancialsSubnav";
import { FinancialIdentityCard } from "@/components/wallet/FinancialIdentityCard";

export default function PayoutAccountPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-kampmax-text">Payout account</h1>
        <p className="mt-1 text-sm text-kampmax-text-secondary">
          Verify your identity to receive money. You choose the bank account each time you withdraw.
        </p>
      </header>

      <SpFinancialsSubnav />

      <FinancialIdentityCard />
    </div>
  );
}
