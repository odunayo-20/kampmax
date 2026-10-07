"use client";

import { FlFinancialSubnav } from "@/components/freelancer/financials/FlFinancialSubnav";
import { FinancialIdentityCard } from "@/components/wallet/FinancialIdentityCard";

export default function FreelancerPayoutMethodsPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-xl font-bold text-kampmax-text">Payout method</h1>
        <p className="mt-1 text-sm text-kampmax-text-secondary">
          Verify your identity to receive money. You choose the bank account each time you withdraw.
        </p>
      </header>

      <FlFinancialSubnav />

      <FinancialIdentityCard />
    </div>
  );
}
