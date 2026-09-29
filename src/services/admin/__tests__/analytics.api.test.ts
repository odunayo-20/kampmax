import { beforeEach, describe, expect, it, vi } from "vitest";

const getMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/api-client", () => ({
  apiClient: {
    get: getMock,
  },
}));

import { createApiAnalyticsService } from "../analytics.api";

describe("createApiAnalyticsService (live analytics)", () => {
  const service = createApiAnalyticsService();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getFilterOptions", () => {
    it("fetches active campuses, active vendors, and product categories", async () => {
      getMock.mockImplementation((url: string) => {
        if (url.includes("/admin/campuses")) {
          return Promise.resolve({
            data: {
              items: [
                { id: "c1", name: "University of Lagos" },
                { id: "c2", name: "Obafemi Awolowo University" },
              ],
            },
            error: null,
          });
        }
        if (url.includes("/admin/vendors")) {
          return Promise.resolve({
            data: {
              items: [
                { id: "v1", storeName: "TechStore" },
                { id: "v2", storeName: "CampusBooks" },
              ],
            },
            error: null,
          });
        }
        if (url.includes("/categories")) {
          return Promise.resolve({
            data: {
              items: [
                { id: "cat1", name: "Electronics" },
                { id: "cat2", name: "Books" },
              ],
            },
            error: null,
          });
        }
        return Promise.resolve({ data: null, error: null });
      });

      const options = await service.getFilterOptions();

      expect(options.campuses).toEqual([
        { id: "c1", name: "University of Lagos" },
        { id: "c2", name: "Obafemi Awolowo University" },
      ]);
      expect(options.vendors).toEqual([
        { id: "v1", name: "TechStore" },
        { id: "v2", name: "CampusBooks" },
      ]);
      expect(options.categories).toEqual([
        { id: "cat1", name: "Electronics" },
        { id: "cat2", name: "Books" },
      ]);
    });

    it("handles empty responses safely", async () => {
      getMock.mockResolvedValue({ data: null, error: null });

      const options = await service.getFilterOptions();

      expect(options.campuses).toEqual([]);
      expect(options.vendors).toEqual([]);
      expect(options.categories).toEqual([]);
    });
  });

  describe("getReport", () => {
    it("fetches analytics data across marketplace, users, financials, campuses, vendors, products", async () => {
      getMock.mockImplementation((url: string) => {
        if (url.includes("/analytics/admin/marketplace?range=last30d")) {
          return Promise.resolve({
            data: {
              gmv: 500000,
              totalOrders: 100,
              averageOrderValue: 5000,
              totalVendors: 25,
            },
          });
        }
        if (url.includes("/analytics/admin/marketplace?range=custom")) {
          return Promise.resolve({
            data: {
              gmv: 400000,
              totalOrders: 80,
              averageOrderValue: 5000,
              totalVendors: 20,
            },
          });
        }
        if (url.includes("/analytics/admin/users?range=last30d")) {
          return Promise.resolve({
            data: {
              totalUsers: 1500,
              newUsers: 120,
              activeUsers: 850,
            },
          });
        }
        if (url.includes("/analytics/admin/users?range=custom")) {
          return Promise.resolve({
            data: {
              totalUsers: 1380,
              newUsers: 100,
              activeUsers: 800,
            },
          });
        }
        if (url.includes("/analytics/admin/financial")) {
          return Promise.resolve({
            data: {
              gmv: 500000,
              averageOrderValue: 5000,
              deliveredOrderCount: 95,
              totalItemsSold: 210,
            },
          });
        }
        if (url.includes("/analytics/admin/campuses")) {
          return Promise.resolve({
            data: {
              ordersPerCampus: [
                { campusId: "c1", campusName: "University of Lagos", count: 60 },
                { campusId: "c2", campusName: "University of Ibadan", count: 40 },
              ],
              usersPerCampus: [
                { campusId: "c1", campusName: "University of Lagos", count: 900 },
                { campusId: "c2", campusName: "University of Ibadan", count: 600 },
              ],
              vendorsPerCampus: [
                { campusId: "c1", campusName: "University of Lagos", count: 15 },
                { campusId: "c2", campusName: "University of Ibadan", count: 10 },
              ],
            },
          });
        }
        if (url.includes("/admin/vendors")) {
          return Promise.resolve({
            data: {
              items: [
                {
                  id: "v1",
                  storeName: "Campus Gadgets",
                  campusShortName: "UNILAG",
                  categoryName: "Electronics",
                  revenue: 300000,
                  rating: 4.8,
                  createdAt: "2026-01-01T00:00:00.000Z",
                },
              ],
            },
          });
        }
        if (url.includes("/admin/products")) {
          return Promise.resolve({
            data: {
              items: [
                {
                  id: "p1",
                  name: "Scientific Calculator",
                  storeName: "Campus Gadgets",
                  campusShortName: "UNILAG",
                  categoryName: "Electronics",
                  salesCount: 30,
                  revenue: 150000,
                },
              ],
            },
          });
        }
        if (url.includes("/admin/withdrawals")) {
          return Promise.resolve({
            data: {
              items: [],
              meta: { total: 0 },
            },
          });
        }
        return Promise.resolve({ data: null });
      });

      const report = await service.getReport({ range: "30d" });

      expect(report.range).toBe("30d");
      expect(report.kpis.grossSales).toBe(500000);
      expect(report.kpis.grossSalesDelta).toBe(25); // (500k - 400k) / 400k * 100 = +25%
      expect(report.kpis.orders).toBe(100);
      expect(report.kpis.ordersDelta).toBe(25);
      expect(report.kpis.newUsers).toBe(120);
      expect(report.kpis.newUsersDelta).toBe(20);
      expect(report.kpis.activeUsers).toBe(850);
      expect(report.kpis.activeVendors).toBe(25);

      // Financials breakdown
      expect(report.financials.grossSales).toBe(500000);
      expect(report.financials.refunds).toBe(12000); // 2.4% of 500k
      expect(report.financials.commissionRate).toBe(8);

      // Campuses breakdown
      expect(report.campuses).toHaveLength(2);
      expect(report.campuses[0].campusId).toBe("c1");
      expect(report.campuses[0].name).toBe("University of Lagos");
      expect(report.campuses[0].orders).toBe(60);
      expect(report.campuses[0].revenue).toBe(300000); // 60% of 500k

      // Vendors & Products
      expect(report.vendors).toHaveLength(1);
      expect(report.vendors[0].storeName).toBe("Campus Gadgets");
      expect(report.topProducts).toHaveLength(1);
      expect(report.topProducts[0].title).toBe("Scientific Calculator");
      expect(report.categories).toHaveLength(1);
      expect(report.categories[0].name).toBe("Electronics");
    });

    it("passes campusId and categoryId query parameters when provided", async () => {
      getMock.mockResolvedValue({ data: null });

      await service.getReport({
        range: "7d",
        campusId: "campus-abc",
        categoryId: "cat-xyz",
      });

      const calledUrls = getMock.mock.calls.map((call) => call[0]);
      expect(
        calledUrls.some(
          (u) =>
            u.includes("/admin/vendors") &&
            u.includes("campusId=campus-abc")
        )
      ).toBe(true);
      expect(
        calledUrls.some(
          (u) =>
            u.includes("/admin/products") &&
            u.includes("campusId=campus-abc") &&
            u.includes("categoryId=cat-xyz")
        )
      ).toBe(true);
    });
  });
});
