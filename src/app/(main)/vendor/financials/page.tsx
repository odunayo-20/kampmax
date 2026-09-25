"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FinancialsHeader } from "@/components/vendor-financials/FinancialsHeader";
import { FinancialSummaryCards } from "@/components/vendor-financials/FinancialSummaryCards";
import { EscrowReadinessPanel } from "@/components/vendor-financials/EscrowReadinessPanel";
import { PayoutAccountCard } from "@/components/vendor-financials/PayoutAccountCard";
import { TransactionTable } from "@/components/vendor-financials/TransactionTable";
import { FinancialsSkeleton } from "@/components/vendor-financials/FinancialsSkeleton";
import { RequestPayoutModal } from "@/components/vendor-financials/RequestPayoutModal";
import { useFinancialOverview } from "@/hooks/use-vendor-financials";

export default function FinancialsPage() {
  const router = useRouter();
  const overviewQuery = useFinancialOverview();
  const [payoutModalOpen, setPayoutModalOpen] = useState(false);

  if (overviewQuery.isPending) return <FinancialsSkeleton />;

  const overview = overviewQuery.data;
  if (overviewQuery.isError || !overview) {
    return (
      <div className="rounded-xl border border-error-200 bg-error-50 p-6 text-center">
        <p className="text-sm font-medium text-error-700">Couldn&apos;t load your financials.</p>
        <button type="button" onClick={() => overviewQuery.refetch()} className="mt-2 text-xs font-semibold text-error-700 underline">
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <FinancialsHeader overview={overview} onExportStatement={() => router.push("/vendor/financials/statements")} />

      <FinancialSummaryCards cards={overview.cards} />

      <EscrowReadinessPanel data={overview.escrow} />

      <PayoutAccountCard
        account={overview.account}
        onRequestPayout={() => setPayoutModalOpen(true)}
        canRequest={overview.account.status === "verified"}
      />

      <section aria-labelledby="recent-heading" className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 id="recent-heading" className="text-lg font-semibold text-kampmax-text">
            Recent transactions
          </h2>
          <a href="/vendor/financials/transactions" className="text-sm font-medium text-primary-600 hover:underline">
            View all
          </a>
        </div>
        <TransactionTable items={overview.recentTransactions} compact onRowClick={(tx) => router.push(`/vendor/financials/${tx.id}`)} />
      </section>

      <RequestPayoutModal
        isOpen={payoutModalOpen}
        onClose={() => setPayoutModalOpen(false)}
        account={overview.account}
        availableBalance={overview.available}
        onSuccess={() => {}}
      />
    </div>
  );
}
