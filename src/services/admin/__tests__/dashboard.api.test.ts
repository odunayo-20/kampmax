import { beforeEach, describe, expect, it, vi } from "vitest";

const getMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/api-client", () => ({
  apiClient: {
    get: getMock,
  },
}));

import { createApiDashboardService } from "../dashboard.api";

describe("createApiDashboardService (live dashboard)", () => {
  const service = createApiDashboardService();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getOverview", () => {
    it("aggregates totals, financial, marketplace, and operations from live endpoints", async () => {
      getMock.mockImplementation((url: string) => {
        if (url.includes("/analytics/admin/overview")) {
          return Promise.resolve({
            data: {
              users: 1540,
              activeUsers: 890,
              vendors: 120,
              activeVendors: 95,
              campuses: 6,
              orders: 4320,
              deliveredOrdersValue: 48500000,
            },
            error: null,
          });
        }
        if (url.includes("/analytics/admin/marketplace?range=today")) {
          return Promise.resolve({
            data: { gmv: 350000, totalOrders: 42 },
            error: null,
          });
        }
        if (url.includes("/analytics/admin/marketplace?range=last7d")) {
          return Promise.resolve({
            data: { gmv: 2450000, totalOrders: 310 },
            error: null,
          });
        }
        if (url.includes("/analytics/admin/marketplace?range=last30d")) {
          return Promise.resolve({
            data: { gmv: 9800000, totalProducts: 640, pendingOrders: 15 },
            error: null,
          });
        }
        if (url.includes("/analytics/admin/financial?range=last30d")) {
          return Promise.resolve({
            data: { gmv: 9800000 },
            error: null,
          });
        }
        if (url.includes("/admin/withdrawals/counts")) {
          return Promise.resolve({
            data: {
              all: 35,
              byStatus: { pending: 4, successful: 30, rejected: 1 },
              totalVolume: 1200000,
              successfulVolume: 1050000,
              pendingVolume: 150000,
            },
            error: null,
          });
        }
        if (url.includes("/admin/vendors/verification-queue")) {
          return Promise.resolve({
            data: { meta: { total: 7 } },
            error: null,
          });
        }
        if (url.includes("/admin/products?status=pending_approval")) {
          return Promise.resolve({
            data: { meta: { total: 12 } },
            error: null,
          });
        }
        if (url.includes("/admin/safety/counts")) {
          return Promise.resolve({
            data: {
              all: 8,
              byTargetType: { product: 3, user: 2, post: 3 },
              open: 5,
            },
            error: null,
          });
        }
        if (url.includes("/admin/disputes/counts")) {
          return Promise.resolve({
            data: {
              all: 10,
              byStatus: { open: 2, resolved: 8 },
            },
            error: null,
          });
        }
        return Promise.resolve({ data: null, error: null });
      });

      const overview = await service.getOverview();

      expect(overview.totals.users).toBe(1540);
      expect(overview.totals.activeUsers).toBe(890);
      expect(overview.totals.vendors).toBe(120);
      expect(overview.totals.verifiedVendors).toBe(95);
      expect(overview.totals.campuses).toBe(6);
      expect(overview.totals.products).toBe(640);
      expect(overview.totals.orders).toBe(4320);
      expect(overview.totals.revenue).toBe(9800000);

      expect(overview.financial.revenueToday).toBe(350000);
      expect(overview.financial.revenueWeek).toBe(2450000);
      expect(overview.financial.revenueMonth).toBe(9800000);
      expect(overview.financial.pendingPaymentsCount).toBe(15);
      expect(overview.financial.pendingWithdrawalsCount).toBe(4);
      expect(overview.financial.pendingWithdrawalsAmount).toBe(150000);
      expect(overview.financial.platformEarnings).toBe(Math.round(9800000 * 0.08));

      expect(overview.marketplace.ordersToday).toBe(42);
      expect(overview.marketplace.ordersThisWeek).toBe(310);

      expect(overview.operations.pendingVendorVerification).toBe(7);
      expect(overview.operations.pendingProductApproval).toBe(12);
      expect(overview.operations.pendingWithdrawalRequests).toBe(4);
      expect(overview.operations.reportedProducts).toBe(3);
      expect(overview.operations.reportedUsers).toBe(2);
      expect(overview.operations.openDisputes).toBe(2);
    });

    it("forwards scopeCampusId parameter when provided", async () => {
      getMock.mockResolvedValue({ data: null, error: null });
      await service.getOverview("unilag");

      const calledWithUnilag = getMock.mock.calls.some(([url]: [string]) =>
        url.includes("campusId=unilag")
      );
      expect(calledWithUnilag).toBe(true);
    });
  });

  describe("getStats", () => {
    it("fetches compact KPI snapshot with deltas and commission", async () => {
      getMock.mockImplementation((url: string) => {
        if (url.includes("/analytics/admin/marketplace?range=today")) {
          return Promise.resolve({
            data: { gmv: 500000, totalOrders: 50 },
            error: null,
          });
        }
        if (url.includes("/analytics/admin/marketplace?range=last7d")) {
          return Promise.resolve({
            data: { gmv: 3000000, totalOrders: 300 },
            error: null,
          });
        }
        if (url.includes("/analytics/admin/marketplace?range=custom")) {
          return Promise.resolve({
            data: { gmv: 2500000, totalOrders: 250 },
            error: null,
          });
        }
        if (url.includes("/analytics/admin/overview")) {
          return Promise.resolve({
            data: { activeUsers: 400 },
            error: null,
          });
        }
        if (url.includes("/admin/withdrawals/counts")) {
          return Promise.resolve({
            data: { byStatus: { pending: 3 }, pendingVolume: 75000 },
            error: null,
          });
        }
        if (url.includes("/admin/disputes/counts")) {
          return Promise.resolve({
            data: { byStatus: { open: 1 } },
            error: null,
          });
        }
        if (url.includes("/admin/safety/counts")) {
          return Promise.resolve({
            data: { open: 4 },
            error: null,
          });
        }
        return Promise.resolve({ data: null, error: null });
      });

      const stats = await service.getStats();

      expect(stats.gmvToday).toBe(500000);
      expect(stats.ordersToday).toBe(50);
      expect(stats.activeUsers).toBe(400);
      expect(stats.pendingWithdrawals).toBe(3);
      expect(stats.pendingWithdrawalsAmount).toBe(75000);
      expect(stats.openDisputes).toBe(1);
      expect(stats.flaggedContent).toBe(4);
      expect(stats.commissionToday).toBe(Math.round(500000 * 0.08));
      expect(stats.gmvDeltaPct).toBe(20); // (3000000 - 2500000) / 2500000 = 20%
      expect(stats.ordersDeltaPct).toBe(20); // (300 - 250) / 250 = 20%
    });
  });

  describe("getTopProducts", () => {
    it("maps backend products sorted by revenue to TopProductRow", async () => {
      getMock.mockResolvedValue({
        data: {
          items: [
            {
              id: "p1",
              name: "MacBook Air M2",
              storeName: "Apple Hub",
              campusShortName: "UNILAG",
              salesCount: 15,
              revenue: 18500000,
            },
          ],
        },
        error: null,
      });

      const products = await service.getTopProducts(5);
      expect(getMock).toHaveBeenCalledWith(
        "/admin/products?sortBy=revenue&sortDir=desc&limit=5"
      );
      expect(products).toHaveLength(1);
      expect(products[0]).toEqual({
        productId: "p1",
        title: "MacBook Air M2",
        vendorName: "Apple Hub",
        campusShortName: "UNILAG",
        unitsSold: 15,
        revenue: 18500000,
      });
    });
  });

  describe("getLowStock", () => {
    it("maps backend low stock products to LowStockRow", async () => {
      getMock.mockResolvedValue({
        data: {
          items: [
            {
              id: "p2",
              name: "Casio Calculator fx-991EX",
              storeName: "Campus Stationery",
              stock: 3,
              uiStatus: "active",
            },
          ],
        },
        error: null,
      });

      const lowStock = await service.getLowStock(6);
      expect(getMock).toHaveBeenCalledWith(
        "/admin/products?stock=low&sortBy=stock&sortDir=asc&limit=6"
      );
      expect(lowStock).toHaveLength(1);
      expect(lowStock[0]).toEqual({
        productId: "p2",
        title: "Casio Calculator fx-991EX",
        vendorName: "Campus Stationery",
        status: "active",
        stock: 3,
      });
    });
  });

  describe("getRecentOrders", () => {
    it("maps real backend orders to AdminOrder[]", async () => {
      getMock.mockResolvedValue({
        data: {
          items: [
            {
              id: "KMP-1001",
              customerId: "u1",
              customerName: "Tunde Adebayo",
              vendorId: "v1",
              vendorName: "Campus Tech",
              campusId: "c1",
              total: 25000,
              status: "delivered",
              createdAt: "2026-09-29T10:00:00Z",
            },
          ],
        },
        error: null,
      });

      const orders = await service.getRecentOrders(8);
      expect(getMock).toHaveBeenCalledWith(
        "/admin/orders?sortBy=createdAt&sortDir=desc&limit=8"
      );
      expect(orders).toHaveLength(1);
      expect(orders[0].id).toBe("KMP-1001");
      expect(orders[0].customerName).toBe("Tunde Adebayo");
      expect(orders[0].vendorName).toBe("Campus Tech");
      expect(orders[0].total).toBe(25000);
      expect(orders[0].status).toBe("delivered");
    });
  });

  describe("getCampusSales", () => {
    it("computes sales share per campus from analytics endpoints", async () => {
      getMock.mockImplementation((url: string) => {
        if (url.includes("/analytics/admin/campuses")) {
          return Promise.resolve({
            data: {
              ordersPerCampus: [
                {
                  campusId: "c1",
                  campusName: "University of Lagos",
                  count: 75,
                },
                {
                  campusId: "c2",
                  campusName: "Obafemi Awolowo University",
                  count: 25,
                },
              ],
            },
            error: null,
          });
        }
        if (url.includes("/analytics/admin/marketplace?range=thisMonth")) {
          return Promise.resolve({
            data: { gmv: 1000000 },
            error: null,
          });
        }
        return Promise.resolve({ data: null, error: null });
      });

      const sales = await service.getCampusSales();
      expect(sales).toHaveLength(2);
      expect(sales[0].campusId).toBe("c1");
      expect(sales[0].orders).toBe(75);
      expect(sales[0].revenue).toBe(750000);
      expect(sales[0].sharePct).toBe(75);

      expect(sales[1].campusId).toBe("c2");
      expect(sales[1].orders).toBe(25);
      expect(sales[1].revenue).toBe(250000);
      expect(sales[1].sharePct).toBe(25);
    });
  });

  describe("getActivity", () => {
    it("maps backend audit logs to ActivityFeedItem and categorizes them", async () => {
      getMock.mockResolvedValue({
        data: {
          items: [
            {
              id: "audit-1",
              at: "2026-09-29T12:00:00Z",
              action: "vendor.verification.update",
              actor: { type: "admin", id: "adm-1", name: "Super Admin" },
              resource: { type: "vendor", id: "v-42" },
              result: "success",
              severity: "medium",
            },
            {
              id: "audit-2",
              at: "2026-09-29T11:00:00Z",
              action: "auth.login.success",
              actor: { type: "user", id: "u-10", name: "Chidi Obi" },
              resource: { type: "user", id: "u-10" },
              result: "success",
              severity: "low",
            },
            {
              id: "audit-3",
              at: "2026-09-29T10:00:00Z",
              action: "order.cancel",
              actor: { type: "admin", id: "adm-1", name: "Super Admin" },
              resource: { type: "order", id: "ord-99" },
              result: "success",
              severity: "high",
            },
          ],
          meta: { total: 3, page: 1, limit: 50, totalPages: 1 },
        },
        error: null,
      });

      const res = await service.getActivity({ pageSize: 50 });
      expect(res.items).toHaveLength(3);
      expect(res.items[0].kind).toBe("vendor_application");
      expect(res.items[1].kind).toBe("registration");
      expect(res.items[2].kind).toBe("order");

      // Filter by kind
      const filtered = await service.getActivity({ kind: "vendor_application" });
      expect(filtered.items).toHaveLength(1);
      expect(filtered.items[0].id).toBe("audit-1");
    });
  });

  describe("getRevenueSeries & getGrowth", () => {
    it("generates revenue series bounded by real backend GMV and order totals", async () => {
      getMock.mockResolvedValue({
        data: { gmv: 700000, totalOrders: 70 },
        error: null,
      });

      const series = await service.getRevenueSeries("7d");
      expect(series).toHaveLength(7);
      const totalRev = series.reduce((sum, p) => sum + p.revenue, 0);
      expect(totalRev).toBe(700000);
      const totalOrd = series.reduce((sum, p) => sum + p.orders, 0);
      expect(totalOrd).toBe(70);
    });

    it("generates cumulative growth series ending at real total platform counts", async () => {
      getMock.mockResolvedValue({
        data: { users: 2400, vendors: 150 },
        error: null,
      });

      const userGrowth = await service.getGrowth("users");
      expect(userGrowth).toHaveLength(12);
      expect(userGrowth[userGrowth.length - 1].total).toBe(2400);

      const vendorGrowth = await service.getGrowth("vendors");
      expect(vendorGrowth).toHaveLength(12);
      expect(vendorGrowth[vendorGrowth.length - 1].total).toBe(150);
    });
  });
});
