// ============================================================
// ADMIN DASHBOARD SERVICE — LIVE HTTP IMPLEMENTATION
//
// Calls the real NestJS backend analytics + admin endpoints:
//   overview         → GET /analytics/admin/overview
//   marketplace      → GET /analytics/admin/marketplace?range=<preset>
//   financial        → GET /analytics/admin/financial?range=<preset>
//   campuses         → GET /analytics/admin/campuses
//   recent orders    → GET /admin/orders?sortBy=createdAt&sortDir=desc&limit=<n>
//   top products     → GET /admin/products?sortBy=revenue&sortDir=desc&limit=<n>
//   low stock        → GET /admin/products?stock=low&sortBy=stock&sortDir=asc&limit=<n>
//   withdrawals      → GET /admin/withdrawals/counts
//   verification q   → GET /admin/vendors/verification-queue?limit=1
//   pending products → GET /admin/products?status=pending_approval&limit=1
//   safety reports   → GET /admin/safety/counts
//   disputes         → GET /admin/disputes/counts
//   activity         → GET /admin/audit-logs?page=<p>&limit=<n>
//   growth/revenue   → trends dynamically computed against real backend totals
// ============================================================

import { apiClient } from "@/lib/api-client";
import type {
  ActivityFeedItem,
  ActivityKind,
  AdminOrder,
  DashboardStats,
  ListQuery,
  LowStockRow,
  ManagedProduct,
  Paginated,
  PlatformOverview,
  TopProductRow,
} from "@/types/admin";
import type { ChartRange, DashboardService, MockDashboardSources } from "./dashboard.service";
import { createMockDashboardService } from "./dashboard.service";
import { toLowStockRow, toTopProductRow } from "./product-rows";

// ---- backend response shapes -------------------------------------------------

interface AnalyticsOverviewResponse {
  users: number;
  activeUsers: number;
  vendors: number;
  activeVendors: number;
  verifiedVendors: number;
  freelancers: number;
  employers: number;
  serviceProviders: number;
  jobs: number;
  proposals: number;
  orders: number;
  completedOrders: number;
  deliveredOrdersValue: number;
  reviews: number;
  averageRating: number;
  serviceBookings: number;
  campuses: number;
}

interface AnalyticsMarketplaceResponse {
  totalOrders: number;
  completedOrders: number;
  cancelledOrders: number;
  pendingOrders: number;
  gmv: number;
  averageOrderValue: number;
  totalItemsSold: number;
  totalProducts: number;
  totalVendors: number;
  ordersByStatus: Array<{ status: string; count: number }>;
  ordersByCampus: Array<{
    campusId: string | null;
    campusName: string;
    count: number;
  }>;
}

interface AnalyticsFinancialResponse {
  gmv: number;
  averageOrderValue: number;
  deliveredOrderCount: number;
  totalItemsSold: number;
  completedEngagementValue: number;
  completedBookingValue: number;
}

interface BackendOrderRow {
  id: string;
  customerId: string;
  customerName: string;
  vendorId: string;
  vendorName: string;
  campusId: string | null;
  total: number;
  status: string;
  createdAt: string;
  customerPhone?: string;
  itemsCount?: number;
  itemsSummary?: string;
  subtotal?: number;
  deliveryFee?: number;
  paymentMethod?: string;
  paymentStatus?: string;
  deliveryMethod?: string;
}

interface BackendPaginatedResult<T> {
  items: T[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

interface WithdrawalCountsResponse {
  all: number;
  byStatus: Record<string, number>;
  totalVolume: number;
  successfulVolume: number;
  pendingVolume: number;
}

interface SafetyCountsResponse {
  all: number;
  byStatus: Record<string, number>;
  bySource: Record<string, number>;
  byTargetType: Record<string, number>;
  open: number;
}

interface DisputesCountsResponse {
  all: number;
  byStatus: {
    open: number;
    resolved: number;
  };
}

interface BackendAuditLogRow {
  id: string;
  at: string;
  action: string;
  actor: { type: string; id: string; name: string };
  resource: { type: string; id: string };
  result: string;
  severity: string;
  isSecurityEvent: boolean;
  previousValue: Record<string, unknown> | null;
  newValue: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
}

// ---- adapter helpers ---------------------------------------------------------

const PLATFORM_FEE_RATE = 0.08;

function pctDelta(current: number, previous: number): number {
  if (previous <= 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

function prevRangeQS(range: ChartRange): string {
  const days = range === "7d" ? 7 : range === "30d" ? 30 : 90;
  const end = new Date();
  end.setDate(end.getDate() - days);
  const start = new Date();
  start.setDate(start.getDate() - days * 2);
  return `range=custom&startDate=${start.toISOString().slice(0, 10)}&endDate=${end.toISOString().slice(0, 10)}`;
}

function mapOrders(items: BackendOrderRow[]): AdminOrder[] {
  return items.map((o) => ({
    id: o.id,
    customerId: o.customerId,
    customerName: o.customerName,
    vendorId: o.vendorId,
    vendorName: o.vendorName,
    campusId: o.campusId ?? "",
    status: o.status as AdminOrder["status"],
    total: o.total,
    createdAt: o.createdAt,
    customerPhone: o.customerPhone ?? "",
    itemsCount: o.itemsCount ?? 0,
    itemsSummary: o.itemsSummary ?? "",
    subtotal: o.subtotal ?? o.total,
    deliveryFee: o.deliveryFee ?? 0,
    paymentMethod: (o.paymentMethod ?? "paystack") as AdminOrder["paymentMethod"],
    paymentStatus: (o.paymentStatus ?? "paid") as AdminOrder["paymentStatus"],
    deliveryMethod: (o.deliveryMethod ?? "campus_pickup") as AdminOrder["deliveryMethod"],
  }));
}

function mapAuditToActivity(row: BackendAuditLogRow): ActivityFeedItem {
  let kind: ActivityKind = "order";
  const act = (row.action || "").toLowerCase();
  const resType = (row.resource?.type || "").toLowerCase();

  if (act.includes("vendor") || resType === "vendor") {
    kind = "vendor_application";
  } else if (
    act.includes("user") ||
    act.includes("auth") ||
    act.includes("ambassador") ||
    resType === "user"
  ) {
    kind = "registration";
  } else if (
    act.includes("report") ||
    act.includes("safety") ||
    act.includes("dispute") ||
    act.includes("review") ||
    resType === "review" ||
    resType === "report" ||
    resType === "post"
  ) {
    kind = "report";
  } else {
    kind = "order";
  }

  const actorName = row.actor?.name || "Admin";
  const resShortId = row.resource?.id
    ? `#${row.resource.id.slice(0, 8)}`
    : "";

  let message = `${row.action.replace(/\./g, " ")}`;
  if (row.resource?.type) {
    message = `${row.resource.type} ${resShortId}: ${row.action.replace(/\./g, " ")}`;
  }
  message = message.charAt(0).toUpperCase() + message.slice(1);

  const meta = row.actor?.name
    ? `By ${row.actor.name}`
    : `System · ${row.severity || "info"}`;

  return {
    id: row.id,
    kind,
    message,
    meta,
    at: row.at || new Date().toISOString(),
  };
}

// ---- factory -----------------------------------------------------------------

export function createApiDashboardService(
  fallbackSources?: Partial<MockDashboardSources>
): DashboardService {
  // If fallback sources are provided, prepare a mock fallback instance for safety
  const mockFallback = fallbackSources
    ? createMockDashboardService({
        users: fallbackSources.users ?? [],
        vendors: fallbackSources.vendors ?? [],
        products: fallbackSources.products ?? [],
        orders: fallbackSources.orders ?? [],
        payments: fallbackSources.payments ?? [],
        withdrawals: fallbackSources.withdrawals ?? [],
        disputes: fallbackSources.disputes ?? [],
        reviews: fallbackSources.reviews ?? [],
        reports: fallbackSources.reports ?? [],
        campuses: fallbackSources.campuses ?? [],
        dailyMetrics: fallbackSources.dailyMetrics ?? [],
        topProducts: fallbackSources.topProducts ?? [],
        lowStock: fallbackSources.lowStock ?? [],
        recentOrders: fallbackSources.recentOrders ?? [],
        activity: fallbackSources.activity ?? [],
      })
    : null;

  return {
    // ------------------------------------------------------------------
    // getOverview — headline metrics + financial summary + operations queue
    // ------------------------------------------------------------------
    async getOverview(scopeCampusId?: string | null): Promise<PlatformOverview> {
      const campusFilter = scopeCampusId ? `&campusId=${encodeURIComponent(scopeCampusId)}` : "";

      const [
        overviewRes,
        mktMonthRes,
        finRes,
        todayRes,
        weekRes,
        withdrawalsRes,
        vendorQueueRes,
        productQueueRes,
        safetyRes,
        disputesRes,
      ] = await Promise.all([
        apiClient.get<AnalyticsOverviewResponse>("/analytics/admin/overview"),
        apiClient.get<AnalyticsMarketplaceResponse>(`/analytics/admin/marketplace?range=last30d${campusFilter}`),
        apiClient.get<AnalyticsFinancialResponse>(`/analytics/admin/financial?range=last30d${campusFilter}`),
        apiClient.get<AnalyticsMarketplaceResponse>(`/analytics/admin/marketplace?range=today${campusFilter}`),
        apiClient.get<AnalyticsMarketplaceResponse>(`/analytics/admin/marketplace?range=last7d${campusFilter}`),
        apiClient.get<WithdrawalCountsResponse>("/admin/withdrawals/counts"),
        apiClient.get<BackendPaginatedResult<unknown>>("/admin/vendors/verification-queue?limit=1"),
        apiClient.get<BackendPaginatedResult<unknown>>("/admin/products?status=pending_approval&limit=1"),
        apiClient.get<SafetyCountsResponse>("/admin/safety/counts"),
        apiClient.get<DisputesCountsResponse>("/admin/disputes/counts"),
      ]);

      if (overviewRes.error || !overviewRes.data) {
        if (mockFallback) return mockFallback.getOverview(scopeCampusId);
      }

      const ov = overviewRes.data;
      const mktMonth = mktMonthRes.data;
      const todayGmv = todayRes.data?.gmv ?? 0;
      const weekGmv = weekRes.data?.gmv ?? 0;
      const monthGmv = mktMonth?.gmv ?? 0;

      const pendingWithdrawalsCount =
        withdrawalsRes.data?.byStatus?.pending ?? 0;
      const pendingWithdrawalsAmount =
        withdrawalsRes.data?.pendingVolume ?? 0;

      const pendingVendorVerification =
        vendorQueueRes.data?.meta?.total ?? 0;
      const pendingProductApproval =
        productQueueRes.data?.meta?.total ?? 0;

      const reportedProducts = safetyRes.data?.byTargetType?.product ?? 0;
      const reportedUsers = safetyRes.data?.byTargetType?.user ?? 0;
      const openDisputes = disputesRes.data?.byStatus?.open ?? 0;

      return {
        totals: {
          users: ov?.users ?? 0,
          activeUsers: ov?.activeUsers ?? 0,
          vendors: ov?.vendors ?? 0,
          verifiedVendors: ov?.verifiedVendors ?? 0,
          campuses: ov?.campuses ?? 0,
          products: mktMonth?.totalProducts ?? 0,
          orders: ov?.orders ?? 0,
          revenue: finRes.data?.gmv ?? monthGmv,
        },
        financial: {
          revenueToday: todayGmv,
          revenueWeek: weekGmv,
          revenueMonth: monthGmv,
          pendingPaymentsCount: mktMonth?.pendingOrders ?? 0,
          pendingPaymentsAmount: 0,
          pendingWithdrawalsCount,
          pendingWithdrawalsAmount,
          platformEarnings: Math.round(monthGmv * PLATFORM_FEE_RATE),
        },
        marketplace: {
          ordersToday: todayRes.data?.totalOrders ?? 0,
          ordersThisWeek: weekRes.data?.totalOrders ?? 0,
        },
        operations: {
          pendingVendorVerification,
          pendingProductApproval,
          pendingWithdrawalRequests: pendingWithdrawalsCount,
          reportedProducts,
          reportedUsers,
          openDisputes,
        },
      };
    },

    // ------------------------------------------------------------------
    // getStats — compact KPI snapshot
    // ------------------------------------------------------------------
    async getStats(scopeCampusId?: string | null): Promise<DashboardStats> {
      const campusFilter = scopeCampusId ? `&campusId=${encodeURIComponent(scopeCampusId)}` : "";

      const [todayRes, weekRes, prevWeekRes, ovRes, withdrawalsRes, disputesRes, safetyRes] =
        await Promise.all([
          apiClient.get<AnalyticsMarketplaceResponse>(`/analytics/admin/marketplace?range=today${campusFilter}`),
          apiClient.get<AnalyticsMarketplaceResponse>(`/analytics/admin/marketplace?range=last7d${campusFilter}`),
          apiClient.get<AnalyticsMarketplaceResponse>(`/analytics/admin/marketplace?${prevRangeQS("7d")}${campusFilter}`),
          apiClient.get<AnalyticsOverviewResponse>("/analytics/admin/overview"),
          apiClient.get<WithdrawalCountsResponse>("/admin/withdrawals/counts"),
          apiClient.get<DisputesCountsResponse>("/admin/disputes/counts"),
          apiClient.get<SafetyCountsResponse>("/admin/safety/counts"),
        ]);

      if (todayRes.error && mockFallback) {
        return mockFallback.getStats(scopeCampusId);
      }

      const gmvToday = todayRes.data?.gmv ?? 0;
      const ordersToday = todayRes.data?.totalOrders ?? 0;
      const gmvWeek = weekRes.data?.gmv ?? 0;
      const prevGmvWeek = prevWeekRes.data?.gmv ?? 0;
      const ordersWeek = weekRes.data?.totalOrders ?? 0;
      const prevOrdersWeek = prevWeekRes.data?.totalOrders ?? 0;

      return {
        gmvToday,
        gmvDeltaPct: pctDelta(gmvWeek, prevGmvWeek),
        ordersToday,
        ordersDeltaPct: pctDelta(ordersWeek, prevOrdersWeek),
        activeUsers: ovRes.data?.activeUsers ?? 0,
        activeUsersDeltaPct: 0,
        pendingWithdrawals: withdrawalsRes.data?.byStatus?.pending ?? 0,
        pendingWithdrawalsAmount: withdrawalsRes.data?.pendingVolume ?? 0,
        openDisputes: disputesRes.data?.byStatus?.open ?? 0,
        flaggedContent: safetyRes.data?.open ?? 0,
        commissionToday: Math.round(gmvToday * PLATFORM_FEE_RATE),
      };
    },

    // ------------------------------------------------------------------
    // getTopProducts — real data from /admin/products sorted by revenue
    // ------------------------------------------------------------------
    async getTopProducts(limit = 6): Promise<TopProductRow[]> {
      const res = await apiClient.get<BackendPaginatedResult<ManagedProduct>>(
        `/admin/products?sortBy=revenue&sortDir=desc&limit=${limit}`
      );
      if (res.error || !res.data?.items) {
        if (mockFallback) return mockFallback.getTopProducts(limit);
        return [];
      }
      return res.data.items.slice(0, limit).map(toTopProductRow);
    },

    // ------------------------------------------------------------------
    // getLowStock — real data from /admin/products with stock=low filter
    // ------------------------------------------------------------------
    async getLowStock(limit = 6): Promise<LowStockRow[]> {
      const res = await apiClient.get<BackendPaginatedResult<ManagedProduct>>(
        `/admin/products?stock=low&sortBy=stock&sortDir=asc&limit=${limit}`
      );
      if (res.error || !res.data?.items) {
        if (mockFallback) return mockFallback.getLowStock(limit);
        return [];
      }
      return res.data.items.slice(0, limit).map(toLowStockRow);
    },

    // ------------------------------------------------------------------
    // getRecentOrders — real data from /admin/orders
    // ------------------------------------------------------------------
    async getRecentOrders(limit = 8): Promise<AdminOrder[]> {
      const res = await apiClient.get<BackendPaginatedResult<BackendOrderRow>>(
        `/admin/orders?sortBy=createdAt&sortDir=desc&limit=${limit}`
      );
      if (res.error || !res.data?.items) {
        if (mockFallback) return mockFallback.getRecentOrders(limit);
        return [];
      }
      return mapOrders(res.data.items.slice(0, limit));
    },

    // ------------------------------------------------------------------
    // getActivity — live audit log stream from /admin/audit-logs
    // ------------------------------------------------------------------
    async getActivity(
      query: ListQuery & { kind?: ActivityFeedItem["kind"] | "all" } = {}
    ): Promise<Paginated<ActivityFeedItem>> {
      const page = query.page ?? 1;
      const pageSize = query.pageSize ?? 50;

      const res = await apiClient.get<BackendPaginatedResult<BackendAuditLogRow>>(
        `/admin/audit-logs?page=${page}&limit=${pageSize}`
      );

      if (res.error || !res.data?.items) {
        if (mockFallback) return mockFallback.getActivity(query);
        return {
          items: [],
          page,
          pageSize,
          total: 0,
          totalPages: 1,
        };
      }

      const allItems = res.data.items.map(mapAuditToActivity);
      const filtered =
        query.kind && query.kind !== "all"
          ? allItems.filter((i) => i.kind === query.kind)
          : allItems;

      return {
        items: filtered,
        page: res.data.meta?.page ?? page,
        pageSize,
        total: filtered.length,
        totalPages: Math.max(1, Math.ceil(filtered.length / pageSize)),
      };
    },
  };
}
