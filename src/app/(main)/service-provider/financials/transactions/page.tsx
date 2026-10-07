"use client";

import { SpFinancialsSubnav } from "@/components/service-provider/financials/SpFinancialsSubnav";
import { WalletActivity } from "@/components/wallet/WalletActivity";

export default function TransactionsPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-kampmax-text">Transactions</h1>
        <p className="mt-1 text-sm text-kampmax-text-secondary">Everything that moved in or out of your wallet.</p>
      </header>

      <SpFinancialsSubnav />

      <WalletActivity />
    </div>
  );
}
