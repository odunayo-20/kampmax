"use client";

import { Suspense, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Download } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { adminErrorMessage } from "@/lib/admin/error-reporting";
import { ChartCard, nairaAxis } from "@/components/admin/ChartCard";
import { StatCard } from "@/components/admin/StatCard";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { FinanceTabs } from "@/components/admin/finance/FinanceTabs";
import {
  FINANCE_CHART_KINDS,
  buildCsv,
  downloadCsv,
  financeStatusVariant,
  fireToast,
} from "@/components/admin/finance/finance-meta";
import { useAdminFinanceReport } from "@/hooks/admin/use-admin-finance";
import { formatNaira } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { MANAGED_FINANCE_REPORT_IDS } from "@/types/admin";
import { FINANCE_REPORT_OPTIONS } from "@/data/admin/finance-reconciliation";
import type {
  ManagedFinanceReport,
  ManagedFinanceReportId,
} from "@/types/admin";

function isReportId(value: string | null): value is ManagedFinanceReportId {
  return value !== null && (MANAGED_FINANCE_REPORT_IDS as readonly string[]).includes(value);
}

export default function AdminFinanceReportsPage() {
  return (
    <Suspense fallback={<ReportsSkeleton />}>
      <AdminFinanceReportsInner />
    </Suspense>
  );
}

function AdminFinanceReportsInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const rawId = searchParams.get("report");
  const [reportId, setReportId] = useState<ManagedFinanceReportId>(
    isReportId(rawId) ? rawId : "revenue_fees"
  );

  const { data, isLoading, error, refetch } = useAdminFinanceReport(reportId);
  const report = data ?? null;

  // Keep the URL in sync so report tabs are shareable (no sensitive data in the URL).
  useEffect(() => {
    const current = searchParams.get("report");
    if (current === reportId) return;
    if (reportId === "revenue_fees" && !current) return;
    const next = reportId === "revenue_fees" ? "" : `?report=${reportId}`;
    router.replace(`${pathname}${next}`, { scroll: false });
  }, [reportId, pathname, router, searchParams]);

  return (
    <>
      <AdminPageHeader
        title="Financial reports"
        description="Tabular reports over orders, payments and wallets with CSV export. Read-only — reports never modify the underlying records."
        actions={
          report ? (
            <button
              type="button"
              onClick={() => {
                downloadCsv(report.exportFilename, buildCsv(report.columns, report.rows));
                fireToast(`Exported ${report.exportFilename}`);
              }}
              className="inline-flex h-9 items-center gap-1.5 rounded-md bg-kampmax-primary px-3 text-xs font-medium text-white hover:bg-kampmax-primary/90"
            >
              <Download className="h-3.5 w-3.5" />
              Export CSV
            </button>
          ) : null
        }
      />

      <FinanceTabs />

      {/* Report selector */}
      <div
        role="radiogroup"
        aria-label="Report"
        className="mb-4 inline-flex flex-wrap overflow-hidden rounded-md border border-kampmax-border bg-white text-xs"
      >
        {FINANCE_REPORT_OPTIONS.map((opt) => (
          <button
            key={opt.id}
            type="button"
            role="radio"
            aria-checked={reportId === opt.id}
            onClick={() => setReportId(opt.id)}
            className={cn(
              "h-9 px-3 font-medium transition-colors",
              reportId === opt.id
                ? "bg-kampmax-navy text-white"
                : "text-kampmax-text-secondary hover:bg-kampmax-muted/60"
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {isLoading && !report ? (
        <div className="mt-4 space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-48 animate-pulse rounded-lg bg-kampmax-surface-hover" />
          ))}
        </div>
      ) : error ? (
        <div className="mt-4 rounded-lg border border-kampmax-error/30 bg-kampmax-error/5 p-6 text-center">
          <p className="text-sm font-medium text-kampmax-error">Failed to load report</p>
          <p className="mt-1 text-xs text-kampmax-text-muted">{adminErrorMessage(error)}</p>
          <button
            onClick={() => void refetch()}
            className="mt-3 rounded-md bg-kampmax-primary px-4 py-1.5 text-xs font-medium text-white hover:bg-kampmax-primary/90"
          >
            Retry
          </button>
        </div>
      ) : !report ? (
        <div className="mt-4 rounded-lg border border-kampmax-border bg-white p-6 text-center text-sm text-kampmax-text-secondary">
          Report not found.
        </div>
      ) : (
        <ReportView report={report} />
      )}
    </>
  );
}

function ReportView({ report }: { report: ManagedFinanceReport }) {
  return (
    <>
      <p className="mb-4 rounded-lg border border-kampmax-border bg-kampmax-surface-hover/50 px-4 py-2.5 text-xs text-kampmax-text-secondary">
        {report.scopeNote}
      </p>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        {report.summary.map((item) => (
          <StatCard
            key={item.label}
            label={item.label}
            value={formatNaira(item.amount)}
            hint={item.hint}
          />
        ))}
      </div>

      {/* Charts */}
      {report.charts.length > 0 && (
        <div className="mt-4 grid gap-4 lg:grid-cols-3">
          {report.charts.map((chart) => (
            <ChartCard
              key={chart.id}
              title={chart.title}
              type={FINANCE_CHART_KINDS[chart.kind]}
              data={chart.series.map((s) => ({ label: s.label, value: s.value }))}
              formatValue={nairaAxis}
            />
          ))}
        </div>
      )}

      {/* Table */}
      <div className="mt-4 overflow-x-auto rounded-lg border border-kampmax-border bg-white">
        <ReportTable report={report} />
      </div>
    </>
  );
}

function ReportTable({ report }: { report: ManagedFinanceReport }) {
  return (
    <table className="w-full min-w-[640px] text-left text-xs">
      <thead className="border-b border-kampmax-border bg-kampmax-muted/40">
        <tr>
          {report.columns.map((col) => (
            <th
              key={col.key}
              className={cn(
                "whitespace-nowrap px-3 py-2.5 font-semibold text-kampmax-text-secondary",
                col.align === "right" && "text-right"
              )}
            >
              {col.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {report.rows.length === 0 ? (
          <tr>
            <td colSpan={report.columns.length} className="px-3 py-8 text-center text-kampmax-text-muted">
              No records match this report.
            </td>
          </tr>
        ) : (
          report.rows.map((row, i) => (
            <tr
              key={String(row.id ?? i)}
              className={cn("border-b border-kampmax-border/60 last:border-0", i % 2 === 1 && "bg-kampmax-muted/20")}
            >
              {report.columns.map((col) => (
                <ReportCell key={col.key} colKey={col.key} value={row[col.key] ?? null} align={col.align} />
              ))}
            </tr>
          ))
        )}
      </tbody>
    </table>
  );
}

function ReportCell({
  colKey,
  value,
  align,
}: {
  colKey: string;
  value: string | number | null;
  align?: "left" | "right";
}) {
  const raw = value === null || value === undefined ? "—" : String(value);
  const isAmount = colKey === "amount" || colKey === "fee" || colKey === "total";
  const numeric = typeof value === "number" ? (value as number) : null;

  if (colKey === "status" || colKey === "paymentStatus") {
    return (
      <td className={cn("whitespace-nowrap px-3 py-2", align === "right" && "text-right")}>
        <StatusBadge variant={financeStatusVariant(raw)} label={raw} />
      </td>
    );
  }

  return (
    <td
      className={cn(
        "whitespace-nowrap px-3 py-2 tabular-nums text-kampmax-text",
        align === "right" && "text-right",
        isAmount && numeric !== null && "font-medium"
      )}
    >
      {isAmount && numeric !== null ? formatNaira(numeric) : raw}
    </td>
  );
}

function ReportsSkeleton() {
  return (
    <>
      <div className="mb-6 h-10 w-56 animate-pulse rounded bg-kampmax-surface-hover" />
      <div className="mb-4 h-9 w-80 animate-pulse rounded bg-kampmax-surface-hover" />
      <div className="grid grid-cols-5 gap-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-lg bg-kampmax-surface-hover" />
        ))}
      </div>
    </>
  );
}