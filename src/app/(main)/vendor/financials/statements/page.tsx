"use client";

import { useMemo, useState } from "react";
import { StatementPanel } from "@/components/vendor-financials/StatementPanel";
import { FinancialsSkeleton } from "@/components/vendor-financials/FinancialsSkeleton";
import { useStatement } from "@/hooks/use-vendor-financials";
import { statementToCsv } from "@/services/vendor-financials-api";

/** The last 12 calendar months, newest first (YYYY-MM). */
function recentPeriods(count = 12): string[] {
  const now = new Date();
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
  });
}

export default function StatementsPage() {
  const availablePeriods = useMemo(() => recentPeriods(), []);
  const [period, setPeriod] = useState(availablePeriods[0]);
  const statementQuery = useStatement(period);

  const handleExport = () => {
    if (!statementQuery.data) return;
    const { csv, filename } = statementToCsv(statementQuery.data);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (statementQuery.isPending) return <FinancialsSkeleton />;
  const statement = statementQuery.data;
  if (statementQuery.isError || !statement) {
    return (
      <div className="rounded-xl border border-error-200 bg-error-50 p-6 text-center">
        <p className="text-sm font-medium text-error-700">Couldn&apos;t load this statement.</p>
        <button type="button" onClick={() => statementQuery.refetch()} className="mt-2 text-xs font-semibold text-error-700 underline">
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-kampmax-text">Statements</h1>
          <p className="mt-1 text-sm text-kampmax-text-secondary">Download monthly financial statements</p>
        </div>
      </header>

      <StatementPanel
        statement={statement}
        onExport={handleExport}
        onPeriodChange={setPeriod}
        availablePeriods={availablePeriods}
      />
    </div>
  );
}
