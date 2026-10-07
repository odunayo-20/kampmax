"use client";

import { FlFinancialSubnav } from "@/components/freelancer/financials/FlFinancialSubnav";
import { WalletActivity } from "@/components/wallet/WalletActivity";

export default function FreelancerTransactionsPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-xl font-bold text-kampmax-text">Transactions</h1>
        <p className="mt-1 text-sm text-kampmax-text-secondary">Everything that moved in or out of your wallet.</p>
      </header>

      <FlFinancialSubnav />

      <WalletActivity />
    </div>
  );
}
