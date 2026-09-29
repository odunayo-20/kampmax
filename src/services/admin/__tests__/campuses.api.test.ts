import { beforeEach, describe, expect, it, vi } from "vitest";

const getMock = vi.hoisted(() => vi.fn());
const patchMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/api-client", () => ({
  apiClient: {
    get: getMock,
    patch: patchMock,
  },
}));

import { createApiCampusService } from "../campuses.api";

describe("createApiCampusService", () => {
  const service = createApiCampusService();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("list", () => {
    it("fetches active campuses from /admin/campuses and maps to Campus[]", async () => {
      getMock.mockResolvedValue({
        data: {
          items: [
            {
              id: "camp-1",
              name: "University of Lagos",
              shortName: "UNILAG",
              city: "Akoka",
              state: "Lagos",
              status: "active",
              usersCount: 4500,
              vendorsCount: 120,
              productsCount: 850,
              ordersCount: 1200,
              revenue: 15000000,
              createdAt: "2025-01-01T00:00:00.000Z",
            },
            {
              id: "camp-2",
              name: "Obafemi Awolowo University",
              shortName: "OAU",
              city: "Ile-Ife",
              state: "Osun",
              status: "active",
              usersCount: 3800,
              vendorsCount: 95,
              productsCount: 620,
              ordersCount: 950,
              revenue: 11000000,
              createdAt: "2025-02-01T00:00:00.000Z",
            },
          ],
          meta: { total: 2, page: 1, limit: 100, totalPages: 1 },
        },
        error: null,
      });

      const campuses = await service.list();

      expect(getMock).toHaveBeenCalledWith("/admin/campuses?limit=100&status=active");
      expect(campuses).toHaveLength(2);
      expect(campuses[0]).toEqual({
        id: "camp-1",
        name: "University of Lagos",
        shortName: "UNILAG",
        city: "Akoka",
        state: "Lagos",
        status: "active",
        studentCount: 4500,
        activeVendors: 120,
        activeListings: 850,
        ordersThisMonth: 1200,
        gmvThisMonth: 15000000,
        launchDate: "2025-01-01T00:00:00.000Z",
      });
      expect(campuses[1].shortName).toBe("OAU");
    });

    it("handles error or missing data gracefully", async () => {
      getMock.mockResolvedValue({ data: null, error: { message: "Error" } });

      const campuses = await service.list();
      expect(campuses).toEqual([]);
    });
  });

  describe("getById", () => {
    it("fetches single campus by id", async () => {
      getMock.mockResolvedValue({
        data: {
          id: "camp-1",
          name: "University of Lagos",
          shortName: "UNILAG",
          city: "Akoka",
          state: "Lagos",
          status: "active",
          usersCount: 4500,
          vendorsCount: 120,
          productsCount: 850,
          ordersCount: 1200,
          revenue: 15000000,
          createdAt: "2025-01-01T00:00:00.000Z",
        },
        error: null,
      });

      const campus = await service.getById("camp-1");
      expect(getMock).toHaveBeenCalledWith("/admin/campuses/camp-1");
      expect(campus?.id).toBe("camp-1");
      expect(campus?.shortName).toBe("UNILAG");
    });
  });
});
