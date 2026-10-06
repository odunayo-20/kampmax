"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { SpFinancialsSubnav } from "@/components/service-provider/financials/SpFinancialsSubnav";
import { TransactionItem } from "@/components/wallet/TransactionItem";
import { WithdrawModal } from "@/components/wallet/WithdrawModal";
import { Button } from "@/components/ui";
import { formatNaira } from "@/lib/utils";
import { getFriendlyErrorMessage } from "@/lib/error-messages";
import { fetchMyWallet, fetchMyWalletTransactions, submitWithdrawal, type WithdrawPayload } from "@/services/wallet";

const KEY = ["sp-payouts"] as const;

export default function PayoutsPage() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  const wallet = useQuery({ queryKey: [...KEY, "wallet"], queryFn: fetchMyWallet, retry: false });
  const history = useQuery({
    queryKey: [...KEY, "withdrawals"],
    queryFn: async () => (await fetchMyWalletTransactions({ limit: 100 })).filter((t) => t.type === "withdrawal"),
    retry: false,
  });

  async function withdraw(payload: WithdrawPayload) {
    await submitWithdrawal(payload);
    await queryClient.invalidateQueries({ queryKey: KEY });
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-kampmax-text">Payouts</h1>
        <p className="mt-1 text-sm text-kampmax-text-secondary">
          Withdraw your wallet balance to a bank account and track each withdrawal.
        </p>
      </header>

      <SpFinancialsSubnav />

      {wallet.isError ? (
        <div role="alert" className="rounded-xl border border-kampmax-border bg-white p-6 text-center">
          <p className="text-sm text-kampmax-text-secondary">{getFriendlyErrorMessage(wallet.error)}</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={() => void wallet.refetch()}>Try again</Button>
        </div>
      ) : (
        <div className="flex flex-col gap-3 rounded-xl border border-kampmax-border bg-white p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs text-kampmax-text-secondary">Available to withdraw</p>
            <p className="text-2xl font-bold text-kampmax-text">
              {wallet.data ? formatNaira(wallet.data.balance) : "…"}
            </p>
          </div>
          <Button onClick={() => setOpen(true)} disabled={!wallet.data || wallet.data.balance < 100}>
            Withdraw
          </Button>
        </div>
      )}

      <section className="rounded-xl border border-kampmax-border bg-white">
        <h2 className="border-b border-kampmax-border px-4 py-3 text-sm font-bold text-kampmax-text">Withdrawals</h2>
        {history.isPending ? (
          <p className="p-6 text-center text-sm text-kampmax-text-secondary">Loading…</p>
        ) : history.isError ? (
          <p role="alert" className="p-6 text-center text-sm text-kampmax-text-secondary">
            {getFriendlyErrorMessage(history.error)}
          </p>
        ) : history.data.length === 0 ? (
          <p className="p-6 text-center text-sm text-kampmax-text-secondary">You haven&apos;t withdrawn anything yet.</p>
        ) : (
          <div className="divide-y divide-kampmax-border">
            {history.data.map((tx) => (
              <TransactionItem key={tx.id} transaction={tx} />
            ))}
          </div>
        )}
      </section>

      <WithdrawModal isOpen={open} onClose={() => setOpen(false)} onWithdraw={withdraw} balance={wallet.data?.balance ?? 0} />
    </div>
  );
}
