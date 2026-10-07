"use client";

import { FlFinancialSubnav } from "@/components/freelancer/financials/FlFinancialSubnav";
import { WalletWithdrawals } from "@/components/wallet/WalletWithdrawals";

export default function FreelancerPayoutsPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-xl font-bold text-kampmax-text">Withdrawals</h1>
        <p className="mt-1 text-sm text-kampmax-text-secondary">
          Withdraw your earnings to a bank account and track each withdrawal.
        </p>
      </header>

      <FlFinancialSubnav />

      <WalletWithdrawals />
    </div>
  );
}
