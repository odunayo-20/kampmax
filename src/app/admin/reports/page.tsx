"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  BarChart3,
  CheckCircle2,
  CircleDollarSign,
  Layers,
  RefreshCw,
  ShoppingCart,
  Store,
  TrendingUp,
  UserCheck,
  UserPlus,
  Users,
  XCircle,
} from "lucide-react";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { LoadingSkeleton } from "@/components/admin/LoadingSkeleton";
import { StatCard } from "@/components/admin/StatCard";
import { ChartCard } from "@/components/admin/ChartCard";
import { Select } from "@/components/ui/Select";
import { cn, formatNaira, formatNairaCompact } from "@/lib/utils";
import { ExportButton } from "@/components/admin/analytics/ExportButton";
import {
  CampusesTable,
  TopProductsTable,
  VendorsPerformanceTable,
} from "@/components/admin/analytics/analytics-tables";
import { analyticsService } from "@/services/admin";
import type {
  AnalyticsFilterOptions,
  AnalyticsQuery,
  AnalyticsRange,
  AnalyticsReport,
} from "@/types/admin";
import type { AdminRole } from "@/types/admin";

export default function AdminReportsPage() {
  return (
    <Suspense fallback={<LoadingSkeleton variant="cards" rows={4} />}>
      <ReportsConsole />
    </Suspense>
  );
}

type SectionTab = "marketplace" | "users" | "vendors" | "campuses" | "financial";

const SECTION_TABS: { key: SectionTab; label: string; icon: typeof BarChart3 }[] = [
  { key: "marketplace", label: "Marketplace", icon: ShoppingCart },
  { key: "users", label: "Users", icon: Users },
  { key: "vendors", label: "Vendors", icon: Store },
  { key: "campuses", label: "Campuses", icon: Layers },
  { key: "financial", label: "Financial", icon: CircleDollarSign },
];

/** Financial analytics is a finance-permission boundary in Module 53:
 *  CAMPUS_ADMIN may use the Analytics console for their operational
 *  sections but must never see platform-wide finance metrics, even if
 *  they navigate to /admin/reports?section=financial directly. */
function canSeeFinanceAnalytics(role: AdminRole): boolean {
  return role === "SUPER_ADMIN" || role === "ADMIN";
}

const RANGE_OPTIONS: { key: AnalyticsRange; label: string }[] = [
  { key: "7d", label: "7D" },
  { key: "30d", label: "30D" },
  { key: "90d", label: "90D" },
  { key: "12m", label: "12M" },
];

function parseInitialQuery(params: { get(name: string): string | null }): AnalyticsQuery {
  const rawRange = params.get("range") as AnalyticsRange | null;
  const range =
    rawRange && RANGE_OPTIONS.some((r) => r.key === rawRange) ? rawRange : "30d";
  return {
    range,
    campusId: params.get("campus") ?? "all",
    vendorId: params.get("vendor") ?? "all",
    categoryId: params.get("category") ?? "all",
  };
}

function ReportsConsole() {
  const searchParams = useSearchParams();
  const [query, setQuery] = useState<AnalyticsQuery>(() =>
    parseInitialQuery(searchParams)
  );
  const [section, setSection] = useState<SectionTab>("marketplace");

  const [report, setReport] = useState<AnalyticsReport | null>(null);
  const [options, setOptions] = useState<AnalyticsFilterOptions | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // Keep the URL shareable.
  useEffect(() => {
    const params = new URLSearchParams();
    if (query.range !== "30d") params.set("range", query.range!);
    if (query.campusId !== "all") params.set("campus", query.campusId!);
    if (query.vendorId !== "all") params.set("vendor", query.vendorId!);
    if (query.categoryId !== "all") params.set("category", query.categoryId!);
    const qs = params.toString();
    window.history.replaceState(null, "", qs ? `?${qs}` : "/admin/reports");
  }, [query]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    Promise.all([
      analyticsService.getReport(query),
      options ? Promise.resolve(options) : analyticsService.getFilterOptions(),
    ])
      .then(([r, o]) => {
        if (cancelled) return;
        setReport(r);
        setOptions(o);
        setLoading(false);
      })
      .catch(() => !cancelled && (setError(true), setLoading(false)));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query.range, query.campusId, query.vendorId, query.categoryId]);

  const patch = useCallback(
    (p: Partial<AnalyticsQuery>) => setQuery((q) => ({ ...q, ...p })),
    []
  );

  return (
    <>
      <AdminPageHeader
        title="Reports & Analytics"
        description="Platform-wide performance across users, vendors, marketplace, campuses and finance."
        actions={
          <>
            {report && (
              <span className="hidden h-9 items-center gap-1.5 rounded-md border border-kampmax-border bg-white px-3 text-xs font-medium text-kampmax-text-secondary lg:inline-flex">
                <TrendingUp className="h-3.5 w-3.5 opacity-60" />
                {report.kpis.grossSalesDelta >= 0 ? "+" : ""}
                {report.kpis.grossSalesDelta.toFixed(1)}% sales ·{" "}
                {report.previousRangeLabel}
              </span>
            )}
            <ExportButton
              onExported={(f) =>
                window.dispatchEvent(
                  new CustomEvent("kampmax-toast", {
                    detail: `Export queued (${f.toUpperCase()}) - placeholder only.`,
                  })
                )
              }
            />
          </>
        }
      />

      {/* Filter toolbar */}
      <div className="mb-4 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          {/* Date-range segmented control */}
          <div
            role="radiogroup"
            aria-label="Date range"
            className="inline-flex overflow-hidden rounded-md border border-kampmax-border bg-white text-xs"
          >
            {RANGE_OPTIONS.map((r) => (
              <button
                key={r.key}
                type="button"
                role="radio"
                aria-checked={query.range === r.key}
                onClick={() => patch({ range: r.key })}
                className={cn(
                  "h-9 px-3 font-medium transition-colors",
                  query.range === r.key
                    ? "bg-kampmax-navy text-white"
                    : "text-kampmax-text-secondary hover:bg-kampmax-muted/60"
                )}
              >
                {r.label}
              </button>
            ))}
          </div>

          <Select
            value={query.campusId}
            aria-label="Filter by campus"
            onChange={(e) => patch({ campusId: e.target.value })}
            className="h-9 w-auto max-w-[180px] text-xs"
          >
            <option value="all">All campuses</option>
            {options?.campuses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
          <Select
            value={query.vendorId}
            aria-label="Filter by vendor"
            onChange={(e) => patch({ vendorId: e.target.value })}
            className="h-9 w-auto max-w-[190px] text-xs"
          >
            <option value="all">All vendors</option>
            {options?.vendors.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
          </Select>
          <Select
            value={query.categoryId}
            aria-label="Filter by category"
            onChange={(e) => patch({ categoryId: e.target.value })}
            className="h-9 w-auto max-w-[190px] text-xs"
          >
            <option value="all">All categories</option>
            {options?.categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {/* Content */}
      {!report && loading ? (
        <LoadingSkeleton variant="cards" rows={8} />
      ) : error || !report ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-kampmax-border bg-white px-6 py-14 text-center">
          <XCircle className="h-6 w-6 text-kampmax-error" />
          <p className="font-semibold text-kampmax-text">Couldn&apos;t load the report</p>
          <button
            type="button"
            onClick={() => patch({})}
            className="inline-flex h-9 items-center gap-1.5 rounded-md border border-kampmax-border bg-white px-3 text-sm font-medium text-kampmax-text hover:bg-kampmax-muted/60"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Retry
          </button>
        </div>
      ) : (
        <>
          {/* KPI summary cards */}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 xl:grid-cols-5">
            <StatCard
              label="Gross sales"
              value={formatNairaCompact(report.kpis.grossSales)}
              icon={CircleDollarSign}
              deltaPct={report.kpis.grossSalesDelta}
              deltaLabel={report.previousRangeLabel}
              tone="gold"
            />
            <StatCard
              label="Orders"
              value={report.kpis.orders.toLocaleString("en-NG")}
              icon={ShoppingCart}
              deltaPct={report.kpis.ordersDelta}
              tone="blue"
            />
            <StatCard
              label="Average order value"
              value={formatNaira(report.kpis.aov)}
              deltaPct={report.kpis.aovDelta}
              tone="default"
            />
            <StatCard
              label="Active users"
              value={report.kpis.activeUsers.toLocaleString("en-NG")}
              icon={UserCheck}
              deltaPct={report.kpis.activeUsersDelta}
              tone="success"
            />
            <StatCard
              label="New users"
              value={report.kpis.newUsers.toLocaleString("en-NG")}
              icon={UserPlus}
              deltaPct={report.kpis.newUsersDelta}
            />
            <StatCard
              label="Active vendors"
              value={report.kpis.activeVendors.toLocaleString("en-NG")}
              icon={Store}
              deltaPct={report.kpis.activeVendorsDelta}
              tone="blue"
            />
            <StatCard
              label="Platform fees"
              value={formatNairaCompact(report.kpis.platformFees)}
              icon={CircleDollarSign}
              hint={`${report.financials.commissionRate}% commission`}
              tone="gold"
            />
            <StatCard
              label="Refunds"
              value={formatNairaCompact(report.kpis.refunds)}
              icon={RefreshCw}
              hint={`${report.financials.refundRate}% of gross sales`}
              tone="warning"
            />
          </div>

          {/* Section tabs */}
          <div
            role="tablist"
            aria-label="Report sections"
            className="mt-4 mb-4 grid grid-cols-2 gap-1 rounded-lg border border-kampmax-border bg-white p-1 sm:flex sm:flex-wrap"
          >
            {SECTION_TABS.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.key}
                  type="button"
                  role="tab"
                  aria-selected={section === tab.key}
                  onClick={() => setSection(tab.key)}
                  className={cn(
                    "inline-flex min-w-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-md px-3 py-2 text-xs font-medium transition-colors sm:text-[13px]",
                    section === tab.key
                      ? "bg-kampmax-navy text-white shadow-sm"
                      : "text-kampmax-text-secondary hover:bg-kampmax-muted/60 hover:text-kampmax-text"
                  )}
                >
                  <Icon className="hidden h-3.5 w-3.5 sm:block" aria-hidden />
                  <span className="truncate">{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* ---------------- MARKETPLACE ---------------- */}
          {section === "marketplace" && (
            <div className="space-y-4">
              <ChartCard
                title="Top categories"
                subtitle="By revenue share"
                type="hbar"
                accent="gold"
                data={report.categories.map((c) => ({
                  label: c.name,
                  value: c.revenue,
                  secondary: `${c.sharePct}%`,
                }))}
                formatValue={(v) => formatNairaCompact(v)}
              />
              <section aria-label="Top products">
                <h2 className="mb-2 mt-6 text-sm font-semibold text-kampmax-text">
                  Top products
                </h2>
                <TopProductsTable rows={report.topProducts} />
              </section>
            </div>
          )}

          {/* ---------------- USERS ---------------- */}
          {section === "users" && (
            <div className="space-y-4">
              <ChartCard
                title="Users by campus"
                subtitle="Registered students per campus"
                type="hbar"
                accent="navy"
                data={[...report.campuses]
                  .sort((a, b) => b.usersCount - a.usersCount)
                  .map((c) => ({
                    label: `${c.shortName} - ${c.name}`,
                    value: c.usersCount,
                    secondary: `${c.newUsers.toLocaleString("en-NG")} new`,
                  }))}
              />
            </div>
          )}

          {/* ---------------- VENDORS ---------------- */}
          {section === "vendors" && (
            <div className="space-y-4">
              <ChartCard
                title="Vendor sales"
                subtitle="Top stores by revenue in range"
                type="hbar"
                accent="blue"
                data={report.vendors.slice(0, 8).map((v) => ({
                  label: v.storeName,
                  value: v.revenue,
                  secondary: `${v.orders.toLocaleString("en-NG")} orders`,
                }))}
                formatValue={(v) => formatNairaCompact(v)}
              />
              <section aria-label="Vendor performance">
                <h2 className="mb-2 text-sm font-semibold text-kampmax-text">
                  Vendor performance
                </h2>
                <VendorsPerformanceTable rows={report.vendors} />
              </section>
            </div>
          )}

          {/* ---------------- CAMPUSES ---------------- */}
          {section === "campuses" && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                <ChartCard
                  title="Revenue by campus"
                  subtitle="Share of gross sales"
                  type="hbar"
                  accent="gold"
                  data={report.campuses.map((c) => ({
                    label: c.shortName,
                    value: c.revenue,
                    secondary: `${Math.round(
                      (report.kpis.grossSales > 0 ? c.revenue / report.kpis.grossSales : 0) * 100
                    )}%`,
                  }))}
                  formatValue={(v) => formatNairaCompact(v)}
                />
                <ChartCard
                  title="Orders by campus"
                  subtitle="Order volume share"
                  type="hbar"
                  accent="navy"
                  data={report.campuses.map((c) => ({
                    label: c.shortName,
                    value: c.orders,
                    secondary: formatNairaCompact(c.aov),
                  }))}
                />
              </div>
              <section aria-label="Campus breakdown">
                <h2 className="mb-2 text-sm font-semibold text-kampmax-text">
                  Campus breakdown
                </h2>
                <CampusesTable rows={report.campuses} />
              </section>
            </div>
          )}

          {/* ---------------- FINANCIAL ---------------- */}
          {section === "financial" && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
                <StatCard
                  label="Gross sales"
                  value={formatNairaCompact(report.financials.grossSales)}
                  hint="All completed order value"
                  tone="gold"
                />
                <StatCard
                  label="Platform fees"
                  value={formatNairaCompact(report.financials.platformFees)}
                  hint={`${report.financials.commissionRate}% commission net of refunds`}
                  tone="blue"
                />
                <StatCard
                  label="Vendor earnings"
                  value={formatNairaCompact(report.financials.vendorEarnings)}
                  hint="Payable to vendors"
                  tone="success"
                />
                <StatCard
                  label="Refunds"
                  value={formatNairaCompact(report.financials.refunds)}
                  hint={`${report.financials.refundRate}% refund rate`}
                  tone="warning"
                />
                <StatCard
                  label="Withdrawals paid"
                  value={formatNairaCompact(report.financials.withdrawalsPaid)}
                  hint={`${formatNairaCompact(report.financials.withdrawalsPendingAmount)} still pending`}
                />
              </div>

              <ChartCard
                title="Money movement breakdown"
                subtitle="Where each naira of gross sales lands"
                type="hbar"
                accent="green"
                data={[
                  { label: "Vendor earnings", value: report.financials.vendorEarnings },
                  { label: "Platform fees", value: report.financials.platformFees },
                  { label: "Refunds issued", value: report.financials.refunds },
                ]}
                formatValue={(v) => formatNaira(v)}
              />

              <p className="rounded-lg border border-dashed border-kampmax-border bg-white px-4 py-3 text-xs leading-relaxed text-kampmax-text-secondary">
                Figures are mock data for prototype review. Refunds shown are
                recorded placeholders - no money moves inside the admin console;
                payouts execute via the payments service.
              </p>
            </div>
          )}
        </>
      )}

      {/* Toast listener for export confirmations */}
      <ExportToasts />
    </>
  );
}

/**
 * Listens for the placeholder-export event so ExportButton stays
 * decoupled from page toast state.
 */
function ExportToasts() {
  const [toast, setToast] = useState<string | null>(null);
  useEffect(() => {
    function onToast(e: Event) {
      const detail = (e as CustomEvent<string>).detail;
      setToast(detail);
      setTimeout(() => setToast(null), 3200);
    }
    window.addEventListener("kampmax-toast", onToast);
    return () => window.removeEventListener("kampmax-toast", onToast);
  }, []);

  if (!toast) return null;
  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed bottom-4 right-4 z-[80] flex flex-col items-end gap-2"
    >
      <div className="flex max-w-sm items-start gap-2 rounded-lg border border-kampmax-border bg-white px-3.5 py-2.5 text-sm shadow-lg animate-[kampmax-fade-in_.18s_ease-out]">
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-kampmax-success" />
        <span>{toast}</span>
      </div>
    </div>
  );
}
