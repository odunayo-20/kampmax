import { beforeEach, describe, expect, it, vi } from "vitest";

const getMock = vi.hoisted(() => vi.fn());
const patchMock = vi.hoisted(() => vi.fn());
const postMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/api-client", () => ({
  apiClient: { get: getMock, patch: patchMock, post: postMock, getBlob: vi.fn() },
}));

import { canAdminPerform } from "@/lib/admin/permissions";
import { createApiAccommodationService } from "../accommodation.api";

const service = createApiAccommodationService();
const BASE = "/accommodation/admin";

const ok = (data: unknown) => ({ data, error: null });
const failure = (status: number, message = "") => ({
  data: {},
  error: Object.assign(new Error(message), { status }),
});

beforeEach(() => {
  getMock.mockReset();
  patchMock.mockReset();
  postMock.mockReset();
});

describe("subscriptions", () => {
  const page = {
    items: [{ id: "s1", agentName: "Obi Homes", listingTitle: "Bright room" }],
    meta: { total: 31, page: 2, limit: 15, totalPages: 3 },
    counts: { ACTIVE: 20, PAST_DUE: 2 },
  };

  it("reshapes the page and keeps the tab counts", async () => {
    getMock.mockResolvedValue(ok(page));
    const result = await service.listSubscriptions();
    expect(getMock).toHaveBeenCalledWith(`${BASE}/subscriptions`);
    expect(result).toEqual({
      items: page.items,
      page: 2,
      pageSize: 15,
      total: 31,
      totalPages: 3,
      counts: page.counts,
    });
  });

  it("sends the status and names the page size 'limit'", async () => {
    getMock.mockResolvedValue(ok(page));
    await service.listSubscriptions({ status: "PAST_DUE", page: 2, pageSize: 15 });
    expect(getMock).toHaveBeenCalledWith(`${BASE}/subscriptions?status=PAST_DUE&page=2&limit=15`);
  });

  it("loads one subscription's billing history, encoding the id", async () => {
    getMock.mockResolvedValue(ok([{ id: "p1" }]));
    expect(await service.subscriptionPayments("a b")).toEqual([{ id: "p1" }]);
    expect(getMock).toHaveBeenCalledWith(`${BASE}/subscriptions/a%20b/payments`);
  });

  it("explains a refusal instead of leaking the status", async () => {
    getMock.mockResolvedValue(failure(403));
    await expect(service.listSubscriptions()).rejects.toThrow("You don't have permission to do that.");
  });
});

describe("overview dashboard", () => {
  it("asks for the default range with no query string", async () => {
    getMock.mockResolvedValue(ok({ agents: {} }));
    await service.dashboard();
    expect(getMock).toHaveBeenCalledWith(`${BASE}/dashboard`);
  });

  it("sends the chosen days", async () => {
    getMock.mockResolvedValue(ok({}));
    await service.dashboard({ from: "2026-11-01", to: "2026-11-30" });
    expect(getMock).toHaveBeenCalledWith(`${BASE}/dashboard?from=2026-11-01&to=2026-11-30`);
  });

  it("sends only the end when only the end is chosen", async () => {
    getMock.mockResolvedValue(ok({}));
    await service.dashboard({ to: "2026-11-30" });
    expect(getMock).toHaveBeenCalledWith(`${BASE}/dashboard?to=2026-11-30`);
  });

  it("uses the backend's own words for a bad range", async () => {
    getMock.mockResolvedValue(failure(400, "The range cannot be longer than 366 days"));
    await expect(service.dashboard({ from: "2020-01-01" })).rejects.toThrow("The range cannot be longer than 366 days");
  });
});

describe("package and settings", () => {
  it("lists packages, turned-off ones included", async () => {
    getMock.mockResolvedValue(ok([{ id: "k1", price: 0 }]));
    expect(await service.listPackages()).toEqual([{ id: "k1", price: 0 }]);
    expect(getMock).toHaveBeenCalledWith(`${BASE}/packages`);
  });

  it("saves only what is sent", async () => {
    patchMock.mockResolvedValue(ok({ id: "k1", price: 2500 }));
    await service.updatePackage("k1", { price: 2500 });
    expect(patchMock).toHaveBeenCalledWith(`${BASE}/packages/k1`, { price: 2500 });
  });

  it("shows why a package change was refused", async () => {
    patchMock.mockResolvedValue(failure(400, "price must not be less than 0"));
    await expect(service.updatePackage("k1", { price: -1 })).rejects.toThrow("price must not be less than 0");
    patchMock.mockResolvedValue(failure(403));
    await expect(service.updatePackage("k1", { price: 1 })).rejects.toThrow("You don't have permission to do that.");
  });

  it("reads and saves the availability settings", async () => {
    getMock.mockResolvedValue(ok({ availabilityIntervalDays: 7, availabilityGraceDays: 3 }));
    expect(await service.getSettings()).toEqual({ availabilityIntervalDays: 7, availabilityGraceDays: 3 });
    patchMock.mockResolvedValue(ok({ availabilityIntervalDays: 10, availabilityGraceDays: 3 }));
    await service.updateSettings({ availabilityIntervalDays: 10 });
    expect(patchMock).toHaveBeenCalledWith(`${BASE}/settings`, { availabilityIntervalDays: 10 });
  });
});

describe("property types and facilities", () => {
  it("lists each kind from its own address", async () => {
    getMock.mockResolvedValue(ok([]));
    await service.listTaxonomy("categories");
    await service.listTaxonomy("amenities");
    expect(getMock).toHaveBeenNthCalledWith(1, `${BASE}/categories`);
    expect(getMock).toHaveBeenNthCalledWith(2, `${BASE}/amenities`);
  });

  it("adds one with a trimmed name, and leaves a blank description out", async () => {
    postMock.mockResolvedValue(ok({ id: "c9" }));
    await service.createTaxonomy("categories", { name: "  Short Stay ", description: "   " });
    expect(postMock).toHaveBeenCalledWith(`${BASE}/categories`, { name: "Short Stay" });
  });

  it("sends a description when there is one", async () => {
    postMock.mockResolvedValue(ok({ id: "c9" }));
    await service.createTaxonomy("amenities", { name: "Pool", description: " Open all year " });
    expect(postMock).toHaveBeenCalledWith(`${BASE}/amenities`, { name: "Pool", description: "Open all year" });
  });

  it("tells the admin it already exists", async () => {
    postMock.mockResolvedValue(failure(409, "A property type with this name already exists"));
    await expect(service.createTaxonomy("categories", { name: "Hostel" })).rejects.toThrow(
      "A property type with this name already exists"
    );
  });

  it("renames or turns off through the item's own address", async () => {
    patchMock.mockResolvedValue(ok({ id: "a1" }));
    await service.updateTaxonomy("amenities", "a1", { isActive: false });
    expect(patchMock).toHaveBeenCalledWith(`${BASE}/amenities/a1`, { isActive: false });
  });

  it("says it no longer exists on a 404", async () => {
    patchMock.mockResolvedValue(failure(404));
    await expect(service.updateTaxonomy("categories", "gone", { name: "X1" })).rejects.toThrow(
      "That no longer exists. It may have been removed."
    );
  });
});

describe("who may configure", () => {
  it("is a Super Admin matter: a live Admin session without the permission cannot", () => {
    const superAdmin = { role: "SUPER_ADMIN" as const, permissions: ["accommodation.configure"] };
    const admin = { role: "ADMIN" as const, permissions: ["accommodation.read", "accommodation.payments.manage"] };
    expect(canAdminPerform(superAdmin, "accommodation", "configure")).toBe(true);
    expect(canAdminPerform(admin, "accommodation", "configure")).toBe(false);
  });

  it("falls back to the role table for a profile with no permission list", () => {
    expect(canAdminPerform({ role: "SUPER_ADMIN" }, "accommodation", "configure")).toBe(true);
    expect(canAdminPerform({ role: "ADMIN" }, "accommodation", "configure")).toBe(false);
  });
});
