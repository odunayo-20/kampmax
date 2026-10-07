"use client";

import { SpFinancialsSubnav } from "@/components/service-provider/financials/SpFinancialsSubnav";
import { WalletWithdrawals } from "@/components/wallet/WalletWithdrawals";

export default function PayoutsPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-kampmax-text">Payouts</h1>
        <p className="mt-1 text-sm text-kampmax-text-secondary">
          Withdraw your wallet balance to a bank account and track each withdrawal.
        </p>
      </header>

      <SpFinancialsSubnav />

      <WalletWithdrawals />
    </div>
  );
}
