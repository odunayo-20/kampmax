// ============================================================
// ADMIN DASHBOARD SERVICE — LIVE HTTP IMPLEMENTATION
//
// Calls the real NestJS backend analytics + admin endpoints.
// Implements the same DashboardService interface as the mock,
// so the UI never changes — only this module is swapped in.
//
// Endpoint map:
//   overview      → GET /analytics/admin/overview
//   marketplace   → GET /analytics/admin/marketplace?range=<preset>
//   campuses      → GET /analytics/admin/campuses
//   recent orders → GET /admin/orders?sortBy=createdAt&sortDir=desc&limit=<n>
//   top products  → GET /admin/products?sortBy=revenue&sortDir=desc&limit=<n>
//   low stock     → GET /admin/products?stock=low&sortBy=stock&sortDir=asc&limit=<n>
//   revenue/growth/activity → delegated to mock until time-series API lands
//
// CAMPUS SCOPE:
//   The analytics endpoints authenticate via the JWT; campus_admin accounts
//   are automatically scoped on the backend. The scopeCampusId param from
//   the UI is forwarded only where the API explicitly accepts it.
// ============================================================

import { apiClient } from "@/lib/api-client";
import type {
  AdminOrder,
  CampusSalesRow,
  LowStockRow,
  TopProductRow,
} from "@/types/admin";
import type { ChartRange, DashboardService } from "./dashboard.service";
import {
  createMockDashboardService,
  type MockDashboardSources,
} from "./dashboard.service";

// ---- backend response shapes -------------------------------------------------

interface AnalyticsOverviewResponse {
  users: number;
  activeUsers: number;
  vendors: number;
  activeVendors: number;
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

interface AnalyticsCampusResponse {
  usersPerCampus: Array<{
    campusId: string | null;
    campusName: string;
    count: number;
  }>;
  vendorsPerCampus: Array<{
    campusId: string | null;
    campusName: string;
    count: number;
  }>;
  productsPerCampus: Array<{
    campusId: string | null;
    campusName: string;
    count: number;
  }>;
  ordersPerCampus: Array<{
    campusId: string | null;
    campusName: string;
    count: number;
  }>;
  jobsPerCampus: Array<{
    campusId: string | null;
    campusName: string;
    count: number;
  }>;
  engagementsPerCampus: Array<{
    campusId: string | null;
    campusName: string;
    count: number;
  }>;
  serviceBookingsPerCampus: Array<{
    campusId: string | null;
    campusName: string;
    count: number;
  }>;
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
}

interface BackendPaginatedResult<T> {
  items: T[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

interface BackendProductRow {
  id: string;
  name: string;
  stock: number;
  revenue: number;
  salesCount: number;
  vendorId: string;
  storeName: string;
  campusId: string | null;
  campusShortName: string | null;
  categoryName: string;
  price: number;
  uiStatus: string;
}

// ---- adapter helpers ---------------------------------------------------------

const PLATFORM_FEE_RATE = 0.08;

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
    // fields not returned by the list endpoint
    customerPhone: "",
    itemsCount: 0,
    itemsSummary: "",
    subtotal: o.total,
    deliveryFee: 0,
    paymentMethod: "paystack",
    paymentStatus: "paid",
    deliveryMethod: "campus_pickup",
  }));
}

function mapTopProducts(items: BackendProductRow[]): TopProductRow[] {
  return items.map((p) => ({
    productId: p.id,
    title: p.name,
    vendorName: p.storeName,
    campusShortName: p.campusShortName ?? "",
    unitsSold: p.salesCount,
    revenue: p.revenue,
  }));
}

function mapLowStock(items: BackendProductRow[]): LowStockRow[] {
  return items.map((p) => ({
    productId: p.id,
    title: p.name,
    vendorName: p.storeName,
    // Map backend uiStatus to AdminProductStatus vocabulary
    status: (p.uiStatus ?? "active") as LowStockRow["status"],
    stock: p.stock,
  }));
}

function buildCampusSales(
  campuses: AnalyticsCampusResponse,
  gmv: number
): CampusSalesRow[] {
  const ordersPerCampus = campuses.ordersPerCampus;
  const totalOrders =
    ordersPerCampus.reduce((a, c) => a + c.count, 0) || 1;

  return [...ordersPerCampus]
    .filter((c) => c.campusId !== null && c.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 8)
    .map((c) => {
      const revenue = Math.round((c.count / totalOrders) * gmv);
      const sharePct =
        gmv > 0 ? Math.round((revenue / gmv) * 100) : 0;
      // Derive a short name from the campus name
      const shortName = c.campusName
        .replace(
          /\b(University|College|Institute|Federal|State|of|and|the)\b/gi,
          ""
        )
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 10);
      return {
        campusId: c.campusId!,
        shortName,
        orders: c.count,
        revenue,
        sharePct,
      };
    });
}

// ---- factory -----------------------------------------------------------------

export function createApiDashboardService(
  fallbackSources: MockDashboardSources
): DashboardService {
  // The mock fills gaps where the backend has no dedicated endpoint yet
  // (chart time-series, activity feed).
  const mock = createMockDashboardService(fallbackSources);

  return {
    // ------------------------------------------------------------------
    // getOverview — headline metrics + financial summary + operations queue
    // ------------------------------------------------------------------
    async getOverview(scopeCampusId) {
      const [overviewRes, mktMonthRes, finRes] = await Promise.all([
        apiClient.get<AnalyticsOverviewResponse>(
          "/analytics/admin/overview"
        ),
        apiClient.get<AnalyticsMarketplaceResponse>(
          "/analytics/admin/marketplace?range=last30d"
        ),
        apiClient.get<AnalyticsFinancialResponse>(
          "/analytics/admin/financial?range=last30d"
        ),
      ]);

      // Hard-fail → fall back to mock
      if (overviewRes.error || !overviewRes.data) {
        return mock.getOverview(scopeCampusId);
      }

      const ov = overviewRes.data;
      const mktMonth = mktMonthRes.data;

      // Grab today + week ranges for financial panels
      const [todayRes, weekRes, withdrawalsRes] = await Promise.all([
        apiClient.get<AnalyticsMarketplaceResponse>(
          "/analytics/admin/marketplace?range=today"
        ),
        apiClient.get<AnalyticsMarketplaceResponse>(
          "/analytics/admin/marketplace?range=last7d"
        ),
        apiClient.get<BackendPaginatedResult<unknown>>(
          "/admin/withdrawals?status=pending&limit=1"
        ),
      ]);

      // Operations queue — pending counts from admin list endpoints
      const [vendorQueueRes, productQueueRes] = await Promise.all([
        apiClient.get<BackendPaginatedResult<unknown>>(
          "/admin/vendors?status=pending&limit=1"
        ),
        apiClient.get<BackendPaginatedResult<unknown>>(
          "/admin/products?status=pending_approval&limit=1"
        ),
      ]);

      const todayGmv = todayRes.data?.gmv ?? 0;
      const weekGmv = weekRes.data?.gmv ?? 0;
      const monthGmv = mktMonth?.gmv ?? 0;

      return {
        totals: {
          users: ov.users,
          activeUsers: ov.activeUsers,
          vendors: ov.vendors,
          verifiedVendors: ov.activeVendors,
          campuses: ov.campuses,
          products: mktMonth?.totalProducts ?? 0,
          orders: ov.orders,
          revenue: finRes.data?.gmv ?? monthGmv,
        },
        financial: {
          revenueToday: todayGmv,
          revenueWeek: weekGmv,
          revenueMonth: monthGmv,
          pendingPaymentsCount: mktMonth?.pendingOrders ?? 0,
          pendingPaymentsAmount: 0,
          pendingWithdrawalsCount:
            withdrawalsRes.data?.meta?.total ?? 0,
          pendingWithdrawalsAmount: 0,
          platformEarnings: Math.round(monthGmv * PLATFORM_FEE_RATE),
        },
        marketplace: {
          ordersToday: todayRes.data?.totalOrders ?? 0,
          ordersThisWeek: weekRes.data?.totalOrders ?? 0,
        },
        operations: {
          pendingVendorVerification:
            vendorQueueRes.data?.meta?.total ?? 0,
          pendingProductApproval:
            productQueueRes.data?.meta?.total ?? 0,
          pendingWithdrawalRequests:
            withdrawalsRes.data?.meta?.total ?? 0,
          reportedProducts: 0,
          reportedUsers: 0,
          openDisputes: 0,
        },
      };
    },

    // ------------------------------------------------------------------
    // getStats — compact KPI snapshot (legacy stat cards)
    // ------------------------------------------------------------------
    async getStats(scopeCampusId) {
      const [mktWeekRes, todayRes, withdrawalsRes] = await Promise.all([
        apiClient.get<AnalyticsMarketplaceResponse>(
          "/analytics/admin/marketplace?range=last7d"
        ),
        apiClient.get<AnalyticsMarketplaceResponse>(
          "/analytics/admin/marketplace?range=today"
        ),
        apiClient.get<BackendPaginatedResult<unknown>>(
          "/admin/withdrawals?status=pending&limit=1"
        ),
      ]);

      if (mktWeekRes.error) {
        return mock.getStats(scopeCampusId);
      }

      return {
        gmvToday: todayRes.data?.gmv ?? 0,
        gmvDeltaPct: 0,
        ordersToday: todayRes.data?.totalOrders ?? 0,
        ordersDeltaPct: 0,
        activeUsers: 0,
        activeUsersDeltaPct: 0,
        pendingWithdrawals: withdrawalsRes.data?.meta?.total ?? 0,
        pendingWithdrawalsAmount: 0,
        openDisputes: 0,
        flaggedContent: 0,
        commissionToday: Math.round(
          (todayRes.data?.gmv ?? 0) * PLATFORM_FEE_RATE
        ),
      };
    },

    // ------------------------------------------------------------------
    // getRevenueSeries — no backend time-series endpoint yet; use mock
    // ------------------------------------------------------------------
    async getRevenueSeries(range: ChartRange = "30d") {
      return mock.getRevenueSeries(range);
    },

    // ------------------------------------------------------------------
    // getGrowth — no backend growth series yet; use mock
    // ------------------------------------------------------------------
    async getGrowth(kind) {
      return mock.getGrowth(kind);
    },

    // ------------------------------------------------------------------
    // getCampusSales — derived from /analytics/admin/campuses
    // ------------------------------------------------------------------
    async getCampusSales() {
      const [campusRes, mktRes] = await Promise.all([
        apiClient.get<AnalyticsCampusResponse>(
          "/analytics/admin/campuses"
        ),
        apiClient.get<AnalyticsMarketplaceResponse>(
          "/analytics/admin/marketplace?range=thisMonth"
        ),
      ]);

      if (campusRes.error || !campusRes.data) {
        return mock.getCampusSales();
      }

      return buildCampusSales(
        campusRes.data,
        mktRes.data?.gmv ?? 0
      );
    },

    // ------------------------------------------------------------------
    // getTopProducts — real data from /admin/products sorted by revenue
    // ------------------------------------------------------------------
    async getTopProducts(limit = 6) {
      const res = await apiClient.get<BackendPaginatedResult<BackendProductRow>>(
        `/admin/products?sortBy=revenue&sortDir=desc&limit=${limit}`
      );
      if (res.error || !res.data?.items?.length) {
        return mock.getTopProducts(limit);
      }
      return mapTopProducts(res.data.items.slice(0, limit));
    },

    // ------------------------------------------------------------------
    // getLowStock — real data from /admin/products with stock=low filter
    // ------------------------------------------------------------------
    async getLowStock(limit = 6) {
      const res = await apiClient.get<BackendPaginatedResult<BackendProductRow>>(
        `/admin/products?stock=low&sortBy=stock&sortDir=asc&limit=${limit}`
      );
      if (res.error || !res.data?.items?.length) {
        return mock.getLowStock(limit);
      }
      return mapLowStock(res.data.items.slice(0, limit));
    },

    // ------------------------------------------------------------------
    // getRecentOrders — real data from /admin/orders
    // ------------------------------------------------------------------
    async getRecentOrders(limit = 8) {
      const res = await apiClient.get<BackendPaginatedResult<BackendOrderRow>>(
        `/admin/orders?sortBy=createdAt&sortDir=desc&limit=${limit}`
      );
      if (res.error || !res.data?.items?.length) {
        return mock.getRecentOrders(limit);
      }
      return mapOrders(res.data.items.slice(0, limit)) as AdminOrder[];
    },

    // ------------------------------------------------------------------
    // getActivity — no platform-activity stream endpoint yet; use mock
    // ------------------------------------------------------------------
    async getActivity(query = {}) {
      return mock.getActivity(query);
    },
  };
}
