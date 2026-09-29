"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { SpFinancialsSubnav } from "@/components/service-provider/financials/SpFinancialsSubnav";
import { SpFinancialsSkeleton } from "@/components/service-provider/financials/SpFinancialsSkeleton";
import { SpFinancialSummaryCards } from "@/components/service-provider/financials/SpFinancialSummaryCards";
import { SpFinancialsPeriodBar } from "@/components/service-provider/financials/SpFinancialsPeriodBar";
import { SpPayoutAccountCard } from "@/components/service-provider/financials/SpPayoutAccountCard";
import { SpTransactionTable } from "@/components/service-provider/financials/SpTransactionTable";
import { getFinancialOverview, getFinancialOverviewLive } from "@/services/service-provider-financials";
import { SP_FINANCIAL_PERIOD } from "@/types/service-provider-financials";
import type { SpFinancialPeriod, SpFinancialOverview } from "@/types/service-provider-financials";

const DEFAULT_PERIOD: SpFinancialPeriod = { key: SP_FINANCIAL_PERIOD.THIRTY_DAYS };

export default function FinancialsOverviewPage() {
  const router = useRouter();
  const [period, setPeriod] = useState<SpFinancialPeriod>(DEFAULT_PERIOD);
  const [overview, setOverview] = useState<SpFinancialOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOverview = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getFinancialOverviewLive(period);
      setOverview(data);
      setError(null);
    } catch {
      try {
        const data = getFinancialOverview(period);
        setOverview(data);
        setError(null);
      } catch {
        setError("You don't have access to financials");
      }
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);

  if (loading && !overview) return <SpFinancialsSkeleton />;
  if (error && !overview) return <div className="text-center py-12 text-kampmax-text-secondary">{error}</div>;
  if (!overview) return null;

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-kampmax-text">Financials</h1>
          <p className="mt-1 text-sm text-kampmax-text-secondary">
            Your earnings, ledger, and payouts
          </p>
        </div>
      </header>

      <SpFinancialsSubnav />

      <SpFinancialsPeriodBar
        period={period}
        onPeriodChange={setPeriod}
        breakdown={overview.breakdown}
      />

      <SpFinancialSummaryCards cards={overview.cards} />

      <SpPayoutAccountCard
        account={overview.account}
        onRequestPayout={() => router.push("/service-provider/financials/payouts")}
        canRequest={overview.account.status === "verified"}
      />

      <section aria-labelledby="recent-heading" className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 id="recent-heading" className="text-lg font-semibold text-kampmax-text">
            Recent transactions
          </h2>
          <a
            href="/service-provider/financials/transactions"
            className="text-sm font-medium text-primary-600 hover:underline"
          >
            View all
          </a>
        </div>
        <SpTransactionTable
          items={overview.recentTransactions}
          compact
          onRowClick={(tx) => router.push(`/service-provider/financials/transactions/${tx.id}`)}
        />
      </section>
    </div>
  );
}