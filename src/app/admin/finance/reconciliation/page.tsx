"use client";

import { Suspense } from "react";
import Link from "next/link";
import { AlertTriangle, CheckCircle2, Info } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { adminErrorMessage } from "@/lib/admin/error-reporting";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { FinanceTabs } from "@/components/admin/finance/FinanceTabs";
import {
  reconOutcomeVariant,
  reconOutcomeDot,
} from "@/components/admin/finance/finance-meta";
import { useAdminFinanceReconciliation } from "@/hooks/admin/use-admin-finance";
import { formatNaira } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type {
  ManagedReconciliationCheck,
  ManagedReconciliationResult,
  ManagedReconciliationRow,
} from "@/types/admin";

export default function AdminFinanceReconciliationPage() {
  return (
    <Suspense fallback={<ReconciliationSkeleton />}>
      <AdminFinanceReconciliationInner />
    </Suspense>
  );
}

function AdminFinanceReconciliationInner() {
  const { data, isLoading, error, refetch } = useAdminFinanceReconciliation();
  const result = data ?? null;

  return (
    <>
      <AdminPageHeader
        title="Finance reconciliation"
        description="Checks that compare orders, payments, escrow and wallets against each other — every variance is quantified and traced to the exact records behind it."
      />

      <FinanceTabs />

      {isLoading && !result ? (
        <div className="mt-4 space-y-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-64 animate-pulse rounded-lg bg-kampmax-surface-hover" />
          ))}
        </div>
      ) : error ? (
        <div className="mt-4 rounded-lg border border-kampmax-error/30 bg-kampmax-error/5 p-6 text-center">
          <p className="text-sm font-medium text-kampmax-error">
            Failed to load reconciliation
          </p>
          <p className="mt-1 text-xs text-kampmax-text-muted">{adminErrorMessage(error)}</p>
          <button
            onClick={() => void refetch()}
            className="mt-3 rounded-md bg-kampmax-primary px-4 py-1.5 text-xs font-medium text-white hover:bg-kampmax-primary/90"
          >
            Retry
          </button>
        </div>
      ) : !result ? (
        <div className="mt-4 rounded-lg border border-kampmax-border bg-white p-6 text-center text-sm text-kampmax-text-secondary">
          No reconciliation data available.
        </div>
      ) : (
        <ReconciliationResult result={result} />
      )}
    </>
  );
}

function ReconciliationResult({ result }: { result: ManagedReconciliationResult }) {
  const s = result.summary;
  return (
    <>
      <p className="mb-4 rounded-lg border border-kampmax-border bg-kampmax-surface-hover/50 px-4 py-2.5 text-xs text-kampmax-text-secondary">
        {result.scopeNote} As at <strong className="font-medium">{formatAsOf(result.asOf)}</strong>.
        Total unexplained variance: <strong className="font-semibold tabular-nums text-kampmax-warning">{formatNaira(s.totalVariance)}</strong>.
      </p>

      {/* Summary strip */}
      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-5">
        <SummaryChip label="Checks" value={String(s.totalChecks)} tone="text-kampmax-text" />
        <SummaryChip label="Balanced" value={String(s.balancedChecks)} tone="text-kampmax-success" />
        <SummaryChip label="Variance" value={String(s.varianceChecks)} tone="text-amber-600" />
        <SummaryChip label="Informational" value={String(s.informationalChecks)} tone="text-kampmax-info" />
        <SummaryChip label="Total variance" value={formatNaira(s.totalVariance)} tone="text-amber-600" />
      </div>

      {/* Checks */}
      <div className="space-y-4">
        {result.checks.map((check) => (
          <CheckCard key={check.id} check={check} />
        ))}
      </div>
    </>
  );
}

function SummaryChip({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: string;
}) {
  return (
    <div className="rounded-lg border border-kampmax-border bg-white px-4 py-3">
      <p className="text-[11px] font-medium text-kampmax-text-secondary">{label}</p>
      <p className={cn("mt-0.5 text-lg font-semibold tabular-nums", tone)}>{value}</p>
    </div>
  );
}

function CheckCard({ check }: { check: ManagedReconciliationCheck }) {
  const OutcomeIcon =
    check.outcome === "balanced" ? CheckCircle2 : check.outcome === "variance" ? AlertTriangle : Info;
  return (
    <section className="rounded-lg border border-kampmax-border bg-white">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-kampmax-border px-4 py-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-sm font-semibold text-kampmax-text">{check.title}</h2>
            <StatusBadge variant={reconOutcomeVariant(check.outcome)} label={check.outcome} />
          </div>
          <p className="mt-1 text-xs text-kampmax-text-secondary">{check.description}</p>
          <p className="mt-1 text-[11px] text-kampmax-text-muted">Scope: {check.scope}</p>
        </div>
        <div className="flex items-center gap-1.5 rounded-md bg-kampmax-muted px-2.5 py-1.5 text-xs font-medium tabular-nums">
          <OutcomeIcon className="h-3.5 w-3.5" />
          {check.outcome === "balanced"
            ? "0 balanced"
            : check.outcome === "variance"
              ? `₦${formatVariance(check.variance)}`
              : "informational"}
        </div>
      </header>

      <div className="grid gap-4 p-4 lg:grid-cols-2">
        <SidePanel
          label={check.left.label}
          amount={check.left.amount}
          rows={check.left.rows}
        />
        <SidePanel
          label={check.right.label}
          amount={check.right.amount}
          rows={check.right.rows}
        />
      </div>

      {check.note && (
        <footer className="border-t border-kampmax-border bg-kampmax-surface-hover/40 px-4 py-3 text-xs text-kampmax-text-secondary">
          {check.note}
        </footer>
      )}
    </section>
  );
}

function SidePanel({
  label,
  amount,
  rows,
}: {
  label: string;
  amount: number;
  rows: ManagedReconciliationRow[];
}) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="text-xs font-medium text-kampmax-text-secondary">{label}</h3>
        <span className="text-sm font-semibold tabular-nums text-kampmax-text">
          {formatNaira(amount)}
        </span>
      </div>
      <ul className="max-h-56 space-y-1 overflow-y-auto pr-1" role="list">
        {rows.length === 0 ? (
          <li className="rounded-md border border-dashed border-kampmax-border px-3 py-2 text-xs text-kampmax-text-muted">
            No records for this side of the check.
          </li>
        ) : (
          rows.map((row) => (
            <li
              key={`${row.id}-${row.label}`}
              className="flex items-center justify-between gap-3 rounded-md bg-kampmax-muted/50 px-3 py-2"
            >
              <div className="min-w-0">
                <p className="flex items-center gap-1.5 truncate text-xs font-medium text-kampmax-text">
                  {row.href ? (
                    <Link
                      href={row.href}
                      className="truncate hover:text-kampmax-blue hover:underline"
                    >
                      {row.label}
                    </Link>
                  ) : (
                    <>
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-kampmax-text-secondary/50" />
                      <span className="truncate">{row.label}</span>
                    </>
                  )}
                </p>
                <p className="mt-0.5 truncate text-[11px] text-kampmax-text-muted">
                  {row.status}
                  {row.createdAt ? ` · ${formatRowDate(row.createdAt)}` : ""}
                </p>
              </div>
              <span className="shrink-0 text-xs font-semibold tabular-nums text-kampmax-text">
                {formatNaira(row.amount)}
              </span>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}

function formatVariance(v: number): string {
  return Math.abs(v).toLocaleString("en-NG", { maximumFractionDigits: 0 });
}

function formatRowDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

function formatAsOf(iso: string): string {
  try {
    return new Date(iso).toLocaleString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

function ReconciliationSkeleton() {
  return (
    <>
      <div className="mb-6 h-10 w-64 animate-pulse rounded bg-kampmax-surface-hover" />
      <div className="mb-4 h-9 w-96 animate-pulse rounded bg-kampmax-surface-hover" />
      <div className="mb-4 grid grid-cols-5 gap-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-16 animate-pulse rounded-lg bg-kampmax-surface-hover" />
        ))}
      </div>
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="h-64 animate-pulse rounded-lg bg-kampmax-surface-hover" />
      ))}
    </>
  );
}