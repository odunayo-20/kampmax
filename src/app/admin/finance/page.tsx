"use client";

import { Suspense } from "react";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  CircleDollarSign,
  Landmark,
  Percent,
  Receipt,
  Undo2,
} from "lucide-react";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { adminErrorMessage } from "@/lib/admin/error-reporting";
import { ChartCard, nairaAxis } from "@/components/admin/ChartCard";
import { StatCard } from "@/components/admin/StatCard";
import { FinanceTabs } from "@/components/admin/finance/FinanceTabs";
import {
  buildCsv,
  downloadCsv,
  fireToast,
} from "@/components/admin/finance/finance-meta";
import { useAdminFinanceOverview } from "@/hooks/admin/use-admin-finance";
import { formatNaira } from "@/lib/utils";
import type { ManagedFinanceOverview } from "@/types/admin";

export default function AdminFinancePage() {
  return (
    <Suspense fallback={<FinanceOverviewSkeleton />}>
      <AdminFinancePageInner />
    </Suspense>
  );
}

function AdminFinancePageInner() {
  const { data, isLoading, error, refetch } = useAdminFinanceOverview();
  const overview = data ?? null;

  return (
    <>
      <AdminPageHeader
        title="Finance"
        description="Read-only platform finance overview computed live from orders, payments and wallets. Every figure traces to a real record — nothing here is generated."
        actions={
          overview ? (
            <button
              type="button"
              onClick={() => {
                if (!overview) return;
                const columns = [
                  { key: "label", label: "Item" },
                  { key: "value", label: "Amount" },
                ];
                const rows = [
                  ...overview.incoming,
                  ...overview.distributed,
                  ...overview.retained,
                ].map((s) => ({ label: s.label, value: s.value }));
                const filename = `kampmax-finance-overview-${new Date().toISOString().slice(0, 10)}.csv`;
                downloadCsv(filename, buildCsv(columns, rows));
                fireToast("Overview exported to CSV");
              }}
              className="inline-flex h-9 items-center gap-1.5 rounded-md bg-kampmax-primary px-3 text-xs font-medium text-white hover:bg-kampmax-primary/90"
            >
              <ArrowDownToLine className="h-3.5 w-3.5" />
              Export overview
            </button>
          ) : null
        }
      />

      <FinanceTabs />

      {isLoading && !overview ? (
        <ErrorOrLoading kind="loading" />
      ) : error ? (
        <ErrorOrLoading kind="error" onRetry={() => void refetch()} message={adminErrorMessage(error)} />
      ) : !overview ? (
        <ErrorOrLoading kind="empty" />
      ) : (
        <FinanceOverview overview={overview} />
      )}
    </>
  );
}

function FinanceOverview({ overview }: { overview: ManagedFinanceOverview }) {
  const k = overview.kpis;
  return (
    <>
      {/* Scope note */}
      <p className="mb-4 rounded-lg border border-kampmax-border bg-kampmax-surface-hover/50 px-4 py-2.5 text-xs text-kampmax-text-secondary">
        {overview.scopeNote}
      </p>

      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard
          label="Collected"
          value={formatNaira(k.collected)}
          icon={CircleDollarSign}
          tone="success"
          hint="paid orders + completed wallet deposits"
        />
        <StatCard
          label="Order GMV (paid)"
          value={formatNaira(k.gmv)}
          icon={Receipt}
          hint="7 paid orders"
        />
        <StatCard
          label="Refunds issued"
          value={formatNaira(k.refunds)}
          icon={Undo2}
          tone="warning"
          hint="refunded orders + wallet credits"
        />
        <StatCard
          label="Held in wallets"
          value={formatNaira(k.heldInWallet)}
          icon={Landmark}
          tone="gold"
          hint="available balances, all wallets"
        />
        <StatCard
          label="Platform fees stored"
          value={formatNaira(k.platformFees)}
          icon={Percent}
          hint="all order records"
        />
        <StatCard
          label="Retained fees"
          value={formatNaira(k.retainedFees)}
          tone="blue"
          hint="paid, non-refunded orders only"
        />
        <StatCard
          label="Payouts delivered"
          value={formatNaira(k.payoutsDelivered)}
          tone="success"
          hint="successful recipient payouts"
        />
        <StatCard
          label="Payouts in flight"
          value={formatNaira(k.payoutsInFlight)}
          icon={ArrowUpFromLine}
          tone="warning"
          hint="processing + pending"
        />
      </div>

      {/* Flow charts */}
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <ChartCard
          title="Incoming money"
          subtitle="Paid order payments by method + completed wallet deposits"
          type="bar"
          data={overview.incoming.map((s) => ({ label: s.label, value: s.value }))}
          formatValue={nairaAxis}
          accent="green"
        />
        <ChartCard
          title="Money out"
          subtitle="Payouts delivered + refunds issued"
          type="bar"
          data={overview.distributed.map((s) => ({ label: s.label, value: s.value }))}
          formatValue={nairaAxis}
          accent="navy"
        />
        <ChartCard
          title="Platform fee accrual"
          subtitle="Stored fees by order stage"
          type="bar"
          data={overview.retained.map((s) => ({ label: s.label, value: s.value }))}
          formatValue={nairaAxis}
          accent="gold"
        />
      </div>

      {/* Vendor breakdowns */}
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <ChartCard
          title="Orders by vendor"
          subtitle="All order records, total value"
          type="hbar"
          data={overview.orderByVendor.map((s) => ({ label: s.label, value: s.value }))}
          formatValue={nairaAxis}
          accent="blue"
        />
        <ChartCard
          title="Platform fees by vendor"
          subtitle="Stored fees across all order records"
          type="hbar"
          data={overview.feeByVendor.map((s) => ({ label: s.label, value: s.value }))}
          formatValue={nairaAxis}
          accent="navy"
        />
      </div>
    </>
  );
}

function ErrorOrLoading({
  kind,
  onRetry,
  message,
}: {
  kind: "loading" | "error" | "empty";
  onRetry?: () => void;
  message?: string;
}) {
  if (kind === "loading") {
    return (
      <div className="mt-4 grid gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-48 animate-pulse rounded-lg bg-kampmax-surface-hover" />
        ))}
      </div>
    );
  }
  if (kind === "empty") {
    return (
      <div className="rounded-lg border border-kampmax-border bg-white p-6 text-center text-sm text-kampmax-text-secondary">
        No finance data available.
      </div>
    );
  }
  return (
    <div className="rounded-lg border border-kampmax-error/30 bg-kampmax-error/5 p-6 text-center">
      <p className="text-sm font-medium text-kampmax-error">Failed to load finance overview</p>
      <p className="mt-1 text-xs text-kampmax-text-muted">{message}</p>
      <button
        onClick={onRetry}
        className="mt-3 rounded-md bg-kampmax-primary px-4 py-1.5 text-xs font-medium text-white hover:bg-kampmax-primary/90"
      >
        Retry
      </button>
    </div>
  );
}

function FinanceOverviewSkeleton() {
  return (
    <>
      <div className="mb-6 h-10 w-48 animate-pulse rounded bg-kampmax-surface-hover" />
      <div className="mb-4 h-9 w-72 animate-pulse rounded bg-kampmax-surface-hover" />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-lg bg-kampmax-surface-hover" />
        ))}
      </div>
    </>
  );
}