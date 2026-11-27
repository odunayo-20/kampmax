"use client";

import { SpFinancialsSubnav } from "@/components/service-provider/financials/SpFinancialsSubnav";
import { WalletActivity } from "@/components/wallet/WalletActivity";

export default function TransactionsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-kampmax-text">Transactions</h1>

      <SpFinancialsSubnav />

      <WalletActivity />
    </div>
  );
}
