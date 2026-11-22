"use client";

// ============================================================
// ADMIN DASHBOARD (Module 34)
//
// Every number on this page is fetched through TanStack Query from the
// dashboard service, which aggregates the seeded backend datasets -
// nothing is hardcoded in the UI and there are no invented trends.
// A campus-scoped operator sees campus-filtered aggregates (rows that
// carry a campus dimension). Panels surface real loading / error /
// empty states and retry instead of silently showing stale data.
// ============================================================

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  ArrowRight,
  BadgeCheck,
  Building2,
  Inbox,
  Landmark,
  Package,
  Scale,
  ShoppingBag,
  Store,
  Users,
} from "lucide-react";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { EmptyState } from "@/components/admin/EmptyState";
import { ErrorState } from "@/components/admin/ErrorState";
import { LoadingSkeleton } from "@/components/admin/LoadingSkeleton";
import { MiniStat, StatCard } from "@/components/admin/StatCard";
import { StatusBadge, orderStatusVariant } from "@/components/admin/StatusBadge";
import { cn, formatNaira, formatNairaCompact, timeAgo } from "@/lib/utils";
import { useAdminSession } from "@/lib/admin/admin-auth-context";
import {
  useAdminDashboardActivity,
  useAdminDashboardLowStock,
  useAdminDashboardOverview,
  useAdminDashboardRecentOrders,
  useAdminDashboardTopProducts,
} from "@/hooks/admin/use-admin-dashboard";
import type {
  ActivityFeedItem,
  FinancialMetrics,
  MarketplaceMetrics,
  OperationsQueue,
  OverviewTotals,
} from "@/types/admin";

const CARD = "rounded-lg border border-kampmax-border bg-white";

export function AdminDashboardOverview() {
  const router = useRouter();
  const { admin } = useAdminSession();
  const scopeCampusId = admin?.role === "CAMPUS_ADMIN" ? admin.campusId : null;

  const overview = useAdminDashboardOverview(scopeCampusId);
  const topProducts = useAdminDashboardTopProducts();
  const lowStock = useAdminDashboardLowStock();
  const recentOrders = useAdminDashboardRecentOrders(8);
  const activity = useAdminDashboardActivity(50);
  const [activityKind, setActivityKind] = useState<
    ActivityFeedItem["kind"] | "all"
  >("all");

  const overviewData = overview.data;
  const filteredActivity = activity.data?.filter(
    (a) => activityKind === "all" || a.kind === activityKind
  );

  return (
    <>
      <AdminPageHeader
        title="Platform overview"
        description={
          admin?.role === "CAMPUS_ADMIN" && admin.campusId
            ? `Live snapshot of marketplace health for ${admin.campusId.toUpperCase()}.`
            : "Live snapshot of marketplace health across all campuses."
        }
        actions={
          <>
            {scopeCampusId && (
              <span className="inline-flex items-center gap-1.5 rounded-md border border-kampmax-border bg-white px-3 py-1.5 text-xs font-medium text-kampmax-text-secondary">
                <Building2 className="h-3.5 w-3.5" />
                Scoped · {scopeCampusId.toUpperCase()}
              </span>
            )}
            <span className="inline-flex items-center gap-1.5 rounded-md border border-kampmax-border bg-white px-3 py-1.5 text-xs text-kampmax-text-secondary">
              <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-kampmax-success" />
              Aggregated from platform services
            </span>
          </>
        }
      />

      {/* ---------------- Attention needed (real queue data) ---------------- */}
      <section aria-label="Attention needed" className="mb-4">
        {overview.isPending ? (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-[58px] animate-pulse rounded-md bg-kampmax-muted/70"
              />
            ))}
          </div>
        ) : overview.isError ? (
          <ErrorState compact onRetry={() => overview.refetch()} />
        ) : overviewData ? (
          <AttentionQueue
            operations={overviewData.operations}
            onNavigate={router.push}
          />
        ) : null}
      </section>

      {/* ---------------- Core metrics ---------------- */}
      <section aria-label="Core metrics" className="mb-4">
        {overview.isPending ? (
          <LoadingSkeleton variant="cards" rows={8} />
        ) : overview.isError ? (
          <ErrorState compact onRetry={() => overview.refetch()} />
        ) : overviewData ? (
          <TotalsGrid totals={overviewData.totals} />
        ) : null}
      </section>

      {/* ---------------- Financials ---------------- */}
      <section aria-label="Financial metrics" className="mb-4">
        {overview.isPending ? (
          <div className={cn(CARD, "animate-pulse p-4")}>
            <div className="mb-4 h-4 w-40 rounded bg-kampmax-muted" />
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-7">
              {Array.from({ length: 7 }).map((_, i) => (
                <div
                  key={i}
                  className="h-[58px] animate-pulse rounded-md bg-kampmax-muted/70"
                />
              ))}
            </div>
          </div>
        ) : overview.isError ? (
          <ErrorState compact onRetry={() => overview.refetch()} />
        ) : overviewData ? (
          <Financials financial={overviewData.financial} marketplace={overviewData.marketplace} onNavigate={router.push} />
        ) : null}
      </section>

      {/* ---------------- Marketplace analytics lists ---------------- */}
      <section
        aria-label="Marketplace analytics"
        className="mb-4 grid grid-cols-1 gap-3 xl:grid-cols-3"
      >
        {/* Top products */}
        {topProducts.isError ? (
          <ErrorState compact onRetry={() => topProducts.refetch()} />
        ) : topProducts.isPending ? (
          <LoadingSkeleton variant="detail" rows={6} />
        ) : (
          <div className={CARD}>
            <PanelHeader
              title="Top-selling products"
              subtitle="By units moved (30d)"
              href="/admin/products"
              linkLabel="All products"
            />
            <ul className="divide-y divide-kampmax-border/70">
              {(topProducts.data ?? []).map((p, i) => (
                <li
                  key={p.productId}
                  className="flex items-center gap-3 px-4 py-2.5"
                >
                  <span className="w-5 shrink-0 text-center text-xs font-bold text-kampmax-text-secondary/70">
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-kampmax-text">
                      {p.title}
                    </p>
                    <p className="truncate text-xs text-kampmax-text-secondary">
                      {p.vendorName} · {p.campusShortName}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-semibold tabular-nums text-kampmax-text">
                      {formatNairaCompact(p.revenue)}
                    </p>
                    <p className="text-xs tabular-nums text-kampmax-text-secondary">
                      {p.unitsSold} sold
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Low stock */}
        {lowStock.isError ? (
          <ErrorState compact onRetry={() => lowStock.refetch()} />
        ) : lowStock.isPending ? (
          <LoadingSkeleton variant="detail" rows={6} />
        ) : (
          <div className={CARD}>
            <PanelHeader
              title="Low-stock listings"
              subtitle="Running out - vendors should restock"
              href="/admin/products"
              linkLabel="Inventory"
            />
            <ul className="divide-y divide-kampmax-border/70">
              {(lowStock.data ?? []).map((p) => (
                <li key={p.productId} className="flex items-center gap-3 px-4 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-kampmax-text">
                      {p.title}
                    </p>
                    <p className="truncate text-xs text-kampmax-text-secondary">
                      {p.vendorName}
                    </p>
                  </div>
                  <StatusBadge
                    dot={false}
                    variant={p.stock <= 2 ? "error" : p.stock <= 5 ? "warning" : "neutral"}
                    label={`${p.stock} left`}
                    className="shrink-0 tabular-nums"
                  />
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Community pulse (real audit trail) */}
        {activity.isError ? (
          <ErrorState compact onRetry={() => activity.refetch()} />
        ) : activity.isPending ? (
          <LoadingSkeleton variant="detail" rows={6} />
        ) : activity.data && activity.data.length > 0 ? (
          <div className={CARD}>
            <PanelHeader title="Latest activity" subtitle="Recent events across the platform" />
            <ul className="divide-y divide-kampmax-border/70">
              {activity.data.slice(0, 6).map((item) => (
                <li key={item.id} className="flex items-start gap-3 px-4 py-2.5">
                  <ActivityIcon kind={item.kind} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-kampmax-text">{item.message}</p>
                    <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-kampmax-text-secondary">
                      <span className="truncate">{item.meta}</span>
                      <span>·</span>
                      <span>{timeAgo(item.at)}</span>
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <EmptyState
            compact
            icon={Inbox}
            title="No activity yet"
            message="Events will appear here as they happen."
          />
        )}
      </section>

      {/* ---------------- Recent orders + full activity feed ---------------- */}
      <section aria-label="Recent orders and activity feed" className="grid grid-cols-1 gap-3 xl:grid-cols-5">
        {/* Recent orders */}
        <div className={cn(CARD, "xl:col-span-3")}>
          <PanelHeader
            title="Recent orders"
            subtitle="Latest transactions across campuses"
            href="/admin/orders"
            linkLabel="All orders"
          />
          {recentOrders.isError ? (
            <ErrorState compact className="m-4" onRetry={() => recentOrders.refetch()} />
          ) : recentOrders.isPending ? (
            <LoadingSkeleton variant="table" rows={6} className="border-0" />
          ) : recentOrders.data && recentOrders.data.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-sm">
                <thead>
                  <tr className="border-b border-kampmax-border bg-kampmax-muted/50 text-left text-xs uppercase tracking-wide text-kampmax-text-secondary">
                    <th className="px-4 py-2 font-medium">Order</th>
                    <th className="px-4 py-2 font-medium">Customer</th>
                    <th className="hidden px-4 py-2 font-medium md:table-cell">Vendor</th>
                    <th className="px-4 py-2 text-right font-medium">Total</th>
                    <th className="px-4 py-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-kampmax-border/70">
                  {recentOrders.data.map((o) => (
                    <tr key={o.id} className="transition-colors hover:bg-kampmax-muted/40">
                      <td className="whitespace-nowrap px-4 py-2.5">
                        <span className="font-mono text-xs font-semibold text-kampmax-blue">{o.id}</span>
                        <span className="block text-[11px] text-kampmax-text-secondary">{timeAgo(o.createdAt)}</span>
                      </td>
                      <td className="max-w-[140px] truncate px-4 py-2.5">{o.customerName}</td>
                      <td className="hidden max-w-[150px] truncate px-4 py-2.5 md:table-cell">{o.vendorName}</td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-right font-semibold tabular-nums">{formatNaira(o.total)}</td>
                      <td className="px-4 py-2.5">
                        <StatusBadge variant={orderStatusVariant(o.status)} label={o.status.replace(/_/g, " ")} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState
              compact
              className="m-4"
              icon={ShoppingBag}
              title="No orders yet"
              message="Orders will appear here once customers start checking out."
            />
          )}
        </div>

        {/* Activity feed */}
        <div className={cn(CARD, "xl:col-span-2")}>
          <PanelHeader title="Activity feed" />
          <div
            className="flex gap-1 overflow-x-auto border-b border-kampmax-border px-3 py-2 no-scrollbar"
            role="tablist"
            aria-label="Filter activity"
          >
            {(["all", "order", "registration", "vendor_application", "report"] as const).map((k) => (
              <button
                key={k}
                role="tab"
                aria-selected={activityKind === k}
                onClick={() => setActivityKind(k)}
                className={cn(
                  "whitespace-nowrap rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                  activityKind === k
                    ? "bg-kampmax-navy text-white"
                    : "text-kampmax-text-secondary hover:bg-kampmax-muted hover:text-kampmax-text"
                )}
              >
                {ACTIVITY_TAB_LABELS[k]}
              </button>
            ))}
          </div>

          {activity.isError ? (
            <ErrorState compact className="m-4 border-solid" onRetry={() => activity.refetch()} />
          ) : activity.isPending ? (
            <div className="divide-y divide-kampmax-border/70">
              {Array.from({ length: 7 }).map((_, i) => (
                <div key={i} className="flex items-start gap-3 px-4 py-3">
                  <div className="h-7 w-7 shrink-0 animate-pulse rounded-full bg-kampmax-muted" />
                  <div className="flex-1 space-y-1.5 py-0.5">
                    <div className="h-3 w-full animate-pulse rounded bg-kampmax-muted" />
                    <div className="h-3 w-20 animate-pulse rounded bg-kampmax-muted" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredActivity && filteredActivity.length > 0 ? (
            <ul className="max-h-[380px] divide-y divide-kampmax-border/70 overflow-y-auto">
              {filteredActivity.slice(0, 14).map((item) => (
                <li key={item.id} className="flex items-start gap-3 px-4 py-2.5">
                  <ActivityIcon kind={item.kind} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-kampmax-text">{item.message}</p>
                    <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-kampmax-text-secondary">
                      <span>{item.meta}</span>·<span>{timeAgo(item.at)}</span>
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              compact
              className="m-4"
              icon={ShoppingBag}
              title="No activity matches"
              message="Events will appear here as they happen."
            />
          )}
        </div>
      </section>
    </>
  );
}

// ------------------------------------------------------------
// Section sub-components
// ------------------------------------------------------------

type QueueItem = {
  key: string;
  label: string;
  count: number;
  href: string;
  tone: "warning" | "error";
  icon: typeof Store;
};

function buildQueue(operations: OperationsQueue): {
  items: QueueItem[];
  total: number;
} {
  const items: QueueItem[] = [
    {
      key: "vendor",
      label: "Vendor verifications",
      count: operations.pendingVendorVerification,
      href: "/admin/vendors?status=pending",
      tone: "warning",
      icon: Store,
    },
    {
      key: "product",
      label: "Product approvals",
      count: operations.pendingProductApproval,
      href: "/admin/products?status=pending_review",
      tone: "warning",
      icon: Package,
    },
    {
      key: "withdrawal",
      label: "Withdrawal requests",
      count: operations.pendingWithdrawalRequests,
      href: "/admin/withdrawals?status=pending",
      tone: "warning",
      icon: Landmark,
    },
    {
      key: "reported-products",
      label: "Reported products",
      count: operations.reportedProducts,
      href: "/admin/products?status=flagged",
      tone: "error",
      icon: Package,
    },
    {
      key: "reported-users",
      label: "Reported users",
      count: operations.reportedUsers,
      href: "/admin/users?status=suspended",
      tone: "error",
      icon: Users,
    },
    {
      key: "disputes",
      label: "Open disputes",
      count: operations.openDisputes,
      href: "/admin/disputes?status=open",
      tone: "error",
      icon: Scale,
    },
  ];
  return { items, total: items.reduce((acc, i) => acc + i.count, 0) };
}

function AttentionQueue({
  operations,
  onNavigate,
}: {
  operations: OperationsQueue;
  onNavigate: (href: string) => void;
}) {
  const { items, total } = buildQueue(operations);
  const active = items.filter((i) => i.count > 0);

  if (total === 0) {
    return (
      <EmptyState
        compact
        icon={BadgeCheck}
        title="Queue is clear"
        message="No pending verifications, withdrawals or open disputes right now."
      />
    );
  }

  return (
    <div className="rounded-lg border border-kampmax-border bg-white p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-kampmax-text">Attention needed</h2>
          <p className="mt-0.5 text-xs text-kampmax-text-secondary">
            Live counts from platform queues
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-kampmax-warning/15 px-2.5 py-1 text-xs font-semibold text-amber-600">
          {total} total
        </span>
      </div>
      {active.length > 0 ? (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {active.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => onNavigate(item.href)}
              className="flex items-center gap-3 rounded-md border border-kampmax-border bg-white px-3 py-2.5 text-left transition-colors hover:border-kampmax-blue/40 hover:bg-kampmax-muted/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-kampmax-blue"
            >
              <span
                className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-md",
                  item.tone === "error"
                    ? "bg-kampmax-error/10 text-kampmax-error"
                    : "bg-kampmax-warning/15 text-amber-600"
                )}
              >
                <item.icon className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-xs font-medium text-kampmax-text">
                  {item.label}
                </span>
                <span className="block text-[11px] text-kampmax-text-secondary">
                  {item.tone === "error" ? "needs review" : "waiting in queue"}
                </span>
              </span>
              <span className="shrink-0 text-sm font-bold tabular-nums text-kampmax-text">
                {item.count}
              </span>
            </button>
          ))}
        </div>
      ) : (
        <p className="text-sm text-kampmax-text-secondary">Nothing needs attention right now.</p>
      )}
    </div>
  );
}

function TotalsGrid({ totals }: { totals: OverviewTotals }) {
  const verifiedPct =
    totals.vendors > 0
      ? Math.round((totals.verifiedVendors / totals.vendors) * 100)
      : 0;

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard label="Total users" value={totals.users.toLocaleString("en-NG")} icon={Users} hint="registered accounts" />
      <StatCard label="Active users (30d)" value={totals.activeUsers.toLocaleString("en-NG")} icon={BadgeCheck} tone="success" hint="signed in, last 30 days" />
      <StatCard label="Verified vendors" value={`${totals.verifiedVendors.toLocaleString("en-NG")} of ${totals.vendors.toLocaleString("en-NG")}`} icon={Store} hint={`${verifiedPct}% of all stores`} />
      <StatCard label="Total GMV" value={formatNairaCompact(totals.revenue)} icon={Landmark} tone="gold" hint="sum of completed orders" />
      <StatCard label="Total products" value={totals.products.toLocaleString("en-NG")} icon={Package} hint="listings across campuses" />
      <StatCard label="Total orders" value={totals.orders.toLocaleString("en-NG")} icon={ShoppingBag} hint="all statuses" />
      <StatCard label="Active campuses" value={String(totals.campuses)} icon={Building2} hint="live campuses" />
    </div>
  );
}

function Financials({
  financial,
  marketplace,
  onNavigate,
}: {
  financial: FinancialMetrics;
  marketplace: MarketplaceMetrics;
  onNavigate: (href: string) => void;
}) {
  return (
    <div className={CARD}>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-kampmax-text">Financial summary</h2>
        <Link href="/admin/payments" className="text-xs font-medium text-kampmax-blue hover:underline">
          Payment ledger
          <ArrowRight className="ml-0.5 inline h-3 w-3" />
        </Link>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-7">
        <MiniStat label="Revenue today" value={formatNairaCompact(financial.revenueToday)} />
        <MiniStat label="Revenue this week" value={formatNairaCompact(financial.revenueWeek)} />
        <MiniStat label="Revenue this month" value={formatNairaCompact(financial.revenueMonth)} />
        <MiniStat
          label="Pending payments"
          value={`${financial.pendingPaymentsCount} · ${formatNairaCompact(financial.pendingPaymentsAmount)}`}
          tone="warning"
          onClick={() => onNavigate("/admin/payments?status=pending")}
        />
        <MiniStat
          label="Pending withdrawals"
          value={`${financial.pendingWithdrawalsCount} · ${formatNairaCompact(financial.pendingWithdrawalsAmount)}`}
          tone="warning"
          onClick={() => onNavigate("/admin/withdrawals?status=pending")}
        />
        <MiniStat
          label="Platform earnings (30d)"
          value={formatNairaCompact(financial.platformEarnings)}
          tone="success"
        />
        <MiniStat
          label="Orders today"
          value={String(marketplace.ordersToday)}
        />
      </div>
    </div>
  );
}

const ACTIVITY_TAB_LABELS: Record<ActivityFeedItem["kind"] | "all", string> = {
  all: "All",
  order: "Orders",
  registration: "Signups",
  vendor_application: "Applications",
  report: "Reports",
};

function ActivityIcon({ kind }: { kind: ActivityFeedItem["kind"] }) {
  const cls = "flex h-7 w-7 shrink-0 items-center justify-center rounded-full";
  switch (kind) {
    case "order":
      return (
        <span className={cn(cls, "bg-kampmax-blue/10")}>
          <ShoppingBag className="h-3.5 w-3.5 text-kampmax-blue" />
        </span>
      );
    case "registration":
      return (
        <span className={cn(cls, "bg-kampmax-success/10")}>
          <Users className="h-3.5 w-3.5 text-kampmax-success" />
        </span>
      );
    case "vendor_application":
      return (
        <span className={cn(cls, "bg-kampmax-gold/15")}>
          <Store className="h-3.5 w-3.5 text-kampmax-gold-dark" />
        </span>
      );
    case "report":
      return (
        <span className={cn(cls, "bg-kampmax-error/10")}>
          <Scale className="h-3.5 w-3.5 text-kampmax-error" />
        </span>
      );
  }
}

function PanelHeader({
  title,
  subtitle,
  href,
  linkLabel,
}: {
  title: string;
  subtitle?: string;
  href?: string;
  linkLabel?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-kampmax-border px-4 py-3">
      <div className="min-w-0">
        <h2 className="truncate text-sm font-semibold text-kampmax-text">{title}</h2>
        {subtitle && (
          <p className="mt-0.5 truncate text-xs text-kampmax-text-secondary">{subtitle}</p>
        )}
      </div>
      {href && (
        <Link
          href={href}
          className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-kampmax-blue transition-colors hover:text-kampmax-blue-dark"
        >
          {linkLabel}
          <ArrowRight className="h-3 w-3" />
        </Link>
      )}
    </div>
  );
}
