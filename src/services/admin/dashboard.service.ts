import { apiClient } from "@/lib/api-client";
import {
  ActivityFeedItem,
  AdminOrder,
  AdminProduct,
  AdminReview,
  AdminVendor,
  Campus,
  CampusSalesRow,
  ContentReport,
  DashboardStats,
  Dispute,
  GrowthPoint,
  ListQuery,
  LowStockRow,
  Paginated,
  PaymentRecord,
  PlatformOverview,
  PlatformUser,
  RevenuePoint,
  TopProductRow,
  WithdrawalRequest,
} from "@/types/admin";
import { apiDelay } from "@/lib/admin/api";
import {
  DailyMetric,
  GrowthSeriesPoint,
} from "@/data/admin/system";

// ------------------------------------------------------------
// CONTRACT (future NestJS resources under /admin/dashboard/*)
// ------------------------------------------------------------

export type ChartRange = "7d" | "30d" | "90d";

export interface DashboardService {
  getStats(scopeCampusId?: string | null): Promise<DashboardStats>;
  getOverview(scopeCampusId?: string | null): Promise<PlatformOverview>;
  getRevenueSeries(range?: ChartRange): Promise<RevenuePoint[]>;
  getGrowth(kind: "users" | "vendors"): Promise<GrowthPoint[]>;
  getCampusSales(): Promise<CampusSalesRow[]>;
  getTopProducts(limit?: number): Promise<TopProductRow[]>;
  getLowStock(limit?: number): Promise<LowStockRow[]>;
  getRecentOrders(limit?: number): Promise<AdminOrder[]>;
  getActivity(
    query?: ListQuery & { kind?: ActivityFeedItem["kind"] | "all" }
  ): Promise<Paginated<ActivityFeedItem>>;
}

// ------------------------------------------------------------
// MOCK IMPLEMENTATION
//
// Every number is AGGREGATED from the seeded backend datasets (users,
// vendors, products, orders, payments, withdrawals, reviews, reports,
// disputes, campuses, daily revenue metrics). Deltas are computed
// against the prior 7-day window. When `scopeCampusId` is provided
// (campus-scoped operator) the campus-dimensioned rows are filtered;
// rows without a campus dimension (payments, withdrawals, disputes,
// reports, revenue series) stay platform-wide — a modeled gap until
// the analytics API exposes scoped endpoints.
// ------------------------------------------------------------

export interface MockDashboardSources {
  users: PlatformUser[];
  vendors: AdminVendor[];
  products: AdminProduct[];
  orders: AdminOrder[];
  payments: PaymentRecord[];
  withdrawals: WithdrawalRequest[];
  disputes: Dispute[];
  reviews: AdminReview[];
  reports: ContentReport[];
  campuses: Campus[];
  dailyMetrics: DailyMetric[];
  growthSeries: GrowthSeriesPoint[];
  campusSales: CampusSalesRow[];
  topProducts: TopProductRow[];
  lowStock: LowStockRow[];
  recentOrders: AdminOrder[];
  activity: ActivityFeedItem[];
}

const RANGE_DAYS: Record<ChartRange, number> = { "7d": 7, "30d": 30, "90d": 90 };

function sumAmounts<T extends { amount: number }>(rows: readonly T[]): number {
  return rows.reduce((acc, r) => acc + r.amount, 0);
}

function sumOrderTotals(rows: readonly AdminOrder[]): number {
  return rows.reduce((acc, o) => acc + o.total, 0);
}

/** Signed percentage, 1 decimal, computed against a prior window. */
function pctDelta(current: number, previous: number): number {
  if (previous <= 0) return 0;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

function toRevenuePoints(metrics: DailyMetric[]): RevenuePoint[] {
  return metrics.map((m) => ({
    label: m.label,
    revenue: m.revenue,
    orders: m.orders,
  }));
}

function toGrowthPoints(series: GrowthSeriesPoint[], kind: "users" | "vendors"): GrowthPoint[] {
  return series.map((p) => ({
    label: p.label,
    total: kind === "users" ? p.usersTotal : p.vendorsTotal,
    added:
      kind === "users"
        ? Math.max(0, p.usersTotal - (series[0]?.usersTotal ?? p.usersTotal))
        : Math.max(0, p.vendorsTotal - (series[0]?.vendorsTotal ?? p.vendorsTotal)),
  }));
}

const PLATFORM_FEE_RATE = 0.08;

export function createMockDashboardService(
  sources: MockDashboardSources
): DashboardService {
  const { dailyMetrics } = sources;

  function slice(range: ChartRange): DailyMetric[] {
    return dailyMetrics.slice(-RANGE_DAYS[range]);
  }

  function sumRange(days: number): { revenue: number; orders: number; signups: number } {
    return dailyMetrics.slice(-days).reduce(
      (acc, m) => ({
        revenue: acc.revenue + m.revenue,
        orders: acc.orders + m.orders,
        signups: acc.signups + m.signups,
      }),
      { revenue: 0, orders: 0, signups: 0 }
    );
  }

  /** Rows scoped to a campus for the campus-dimensioned datasets. */
  function scoped(scopeCampusId?: string | null) {
    if (!scopeCampusId) {
      return {
        users: sources.users,
        vendors: sources.vendors,
        products: sources.products,
        orders: sources.orders,
        reviews: sources.reviews,
      };
    }
    return {
      users: sources.users.filter((u) => u.campusId === scopeCampusId),
      vendors: sources.vendors.filter((v) => v.campusId === scopeCampusId),
      products: sources.products.filter((p) => p.campusId === scopeCampusId),
      orders: sources.orders.filter((o) => o.campusId === scopeCampusId),
      reviews: sources.reviews.filter((r) => r.campusId === scopeCampusId),
    };
  }

  const OPEN_DISPUTE_STATUSES = new Set(["open", "under_review"]);
  const OPEN_REPORT_STATUSES = new Set(["open", "reviewing"]);

  function operationsQueue(scopeCampusId?: string | null) {
    const rows = scoped(scopeCampusId);
    return {
      pendingVendorVerification: rows.vendors.filter(
        (v) => v.status === "pending"
      ).length,
      pendingProductApproval: rows.products.filter(
        (p) => p.status === "pending_review"
      ).length,
      pendingWithdrawalRequests: sources.withdrawals.filter(
        (w) => w.status === "pending"
      ).length,
      reportedProducts: sources.reports.filter(
        (r) => r.targetType === "product" && OPEN_REPORT_STATUSES.has(r.status)
      ).length,
      reportedUsers: sources.reports.filter(
        (r) => r.targetType === "user" && OPEN_REPORT_STATUSES.has(r.status)
      ).length,
      openDisputes: sources.disputes.filter((d) =>
        OPEN_DISPUTE_STATUSES.has(d.status)
      ).length,
    };
  }

  return {
    async getStats(scopeCampusId?: string | null) {
      await apiDelay(120);
      const rows = scoped(scopeCampusId);
      const gmvToday = sumRange(1).revenue;
      const ordersToday = sumRange(1).orders;

      const week = sumRange(7);
      const through14 = sumRange(14);
      const prevWeek = {
        revenue: through14.revenue - week.revenue,
        orders: through14.orders - week.orders,
      };

      return {
        gmvToday,
        gmvDeltaPct: pctDelta(week.revenue, prevWeek.revenue),
        ordersToday,
        ordersDeltaPct: pctDelta(week.orders, prevWeek.orders),
        activeUsers: rows.users.filter((u) => u.status === "active").length,
        activeUsersDeltaPct: 0, // no historical active-user baseline modeled
        pendingWithdrawals: sources.withdrawals.filter(
          (w) => w.status === "pending"
        ).length,
        pendingWithdrawalsAmount: sumAmounts(
          sources.withdrawals.filter((w) => w.status === "pending")
        ),
        openDisputes: operationsQueue(scopeCampusId).openDisputes,
        flaggedContent:
          rows.reviews.filter((r) => r.status === "flagged").length +
          rows.products.filter((p) => p.status === "flagged").length,
        commissionToday: Math.round(gmvToday * PLATFORM_FEE_RATE),
      };
    },

    async getOverview(scopeCampusId?: string | null) {
      await apiDelay(180);
      const rows = scoped(scopeCampusId);
      const today = sumRange(1);
      const week = sumRange(7);

      const activeCampuses =
        scopeCampusId
          ? sources.campuses.some(
              (c) => c.id === scopeCampusId && c.status === "active"
            )
            ? 1
            : 0
          : sources.campuses.filter((c) => c.status === "active").length;

      const pendingWithdrawals = sources.withdrawals.filter(
        (w) => w.status === "pending"
      );
      const pendingPayments = sources.payments.filter(
        (p) => p.status === "pending"
      );

      return {
        totals: {
          users: rows.users.length,
          activeUsers: rows.users.filter((u) => u.status === "active").length,
          vendors: rows.vendors.length,
          verifiedVendors: rows.vendors.filter(
            (v) => v.status === "approved"
          ).length,
          campuses: activeCampuses,
          products: rows.products.length,
          orders: rows.orders.length,
          revenue: sumOrderTotals(rows.orders),
        },
        financial: {
          revenueToday: today.revenue,
          revenueWeek: week.revenue,
          revenueMonth: sumRange(30).revenue,
          pendingPaymentsCount: pendingPayments.length,
          pendingPaymentsAmount: sumAmounts(pendingPayments),
          pendingWithdrawalsCount: pendingWithdrawals.length,
          pendingWithdrawalsAmount: sumAmounts(pendingWithdrawals),
          platformEarnings: Math.round(sumRange(30).revenue * PLATFORM_FEE_RATE),
        },
        marketplace: {
          ordersToday: today.orders,
          ordersThisWeek: week.orders,
        },
        operations: operationsQueue(scopeCampusId),
      };
    },

    async getRevenueSeries(range = "30d") {
      await apiDelay(150);
      return toRevenuePoints(slice(range));
    },

    async getGrowth(kind) {
      await apiDelay(150);
      return toGrowthPoints(sources.growthSeries, kind);
    },

    async getCampusSales() {
      await apiDelay(150);
      return sources.campusSales;
    },

    async getTopProducts(limit = 6) {
      await apiDelay(140);
      return sources.topProducts.slice(0, limit);
    },

    async getLowStock(limit = 6) {
      await apiDelay(140);
      return sources.lowStock.slice(0, limit);
    },

    async getRecentOrders(limit = 8) {
      await apiDelay(160);
      return sources.orders.slice(0, limit);
    },

    async getActivity(query = {}) {
      await apiDelay(170);
      const {
        page = 1,
        pageSize = 8,
        kind = "all",
      } = query;

      const filtered =
        kind === "all"
          ? sources.activity
          : sources.activity.filter((a) => a.kind === kind);

      const total = filtered.length;
      const totalPages = Math.max(1, Math.ceil(total / pageSize));
      const safePage = Math.min(page, totalPages);

      return {
        items: filtered.slice((safePage - 1) * pageSize, safePage * pageSize),
        page: safePage,
        pageSize,
        total,
        totalPages,
      };
    },
  };
}