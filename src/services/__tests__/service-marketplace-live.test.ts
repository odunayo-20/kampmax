import { beforeEach, describe, expect, it, vi } from "vitest";

const get = vi.fn();
const post = vi.fn();
const del = vi.fn();
vi.mock("@/lib/api-client", () => ({
  apiClient: {
    get: (...a: unknown[]) => get(...a),
    post: (...a: unknown[]) => post(...a),
    delete: (...a: unknown[]) => del(...a),
  },
}));

import {
  fetchCategoryCounts,
  fetchProviderProfile,
  fetchServiceDetail,
  fetchServiceFavoriteIds,
  fetchServicePage,
  getServiceCategories,
  setServiceFavorite,
} from "../service-marketplace";

const ok = <T>(data: T) => Promise.resolve({ data, error: null });
const fail = (status: number, message = "x") =>
  Promise.resolve({ data: null, error: Object.assign(new Error(message), { status }) });

beforeEach(() => vi.clearAllMocks());

describe("service catalogue", () => {
  it("sends the chosen filters to the server and returns its page", async () => {
    get.mockImplementation(() => ok({ items: [{ id: "s1" }], total: 1, page: 1, pageSize: 12, totalPages: 1 }));
    const page = await fetchServicePage({
      q: " braids ",
      categoryIds: ["c1", "c2"],
      priceBucket: "under_5000",
      ratingMin: 4,
      sort: "price_low",
      page: 2,
      pageSize: 12,
    });
    expect(page.items).toHaveLength(1);
    const url = get.mock.calls[0][0] as string;
    expect(url).toContain("q=braids");
    expect(url).toContain("categoryIds=c1%2Cc2");
    expect(url).toContain("priceBucket=under_5000");
    expect(url).toContain("ratingMin=4");
    expect(url).toContain("sort=price_low");
    expect(url).toContain("limit=12");
  });

  it("throws instead of listing made-up services when the server is down", async () => {
    get.mockImplementation(() => fail(503, "down"));
    await expect(fetchServicePage()).rejects.toThrow("down");
  });

  it("counts categories from the server", async () => {
    get.mockImplementation(() => ok([{ categoryId: "c1", count: 3 }]));
    expect(await fetchCategoryCounts()).toEqual({ c1: 3 });
  });

  it("adds up a category and everything under it", () => {
    const roots = [
      { id: "root", name: "Repairs", slug: "repairs", children: [{ id: "kid", name: "Phones", slug: "phones", children: [] }] },
    ] as never;
    expect(getServiceCategories(roots, { root: 1, kid: 4, other: 9 })[0].serviceCount).toBe(5);
  });
});

describe("detail pages", () => {
  it("returns null for a service or provider that is not public, and throws for a real failure", async () => {
    get.mockImplementation(() => fail(404));
    expect(await fetchServiceDetail("s1")).toBeNull();
    expect(await fetchProviderProfile("chi")).toBeNull();
    get.mockImplementation(() => fail(500, "boom"));
    await expect(fetchServiceDetail("s1")).rejects.toThrow("boom");
  });

  it("asks for a provider by id or slug", async () => {
    get.mockImplementation(() => ok({ provider: { id: "p1" } }));
    await fetchProviderProfile("chi styles");
    expect(get).toHaveBeenCalledWith("/service-provider/providers/chi%20styles");
  });
});

describe("saved services", () => {
  const rows = [
    { id: "w1", targetType: "SERVICE_PROVIDER_SERVICE", targetId: "s1" },
    { id: "w2", targetType: "PRODUCT", targetId: "p1" },
  ];

  it("lists only saved services from the wishlist", async () => {
    get.mockImplementation(() => ok({ items: rows }));
    expect(await fetchServiceFavoriteIds()).toEqual(["s1"]);
  });

  it("saves, and treats 'already saved' as done", async () => {
    post.mockImplementation(() => ok({}));
    expect(await setServiceFavorite("s1", true)).toBe(true);
    expect(post).toHaveBeenCalledWith("/wishlist", { targetType: "SERVICE_PROVIDER_SERVICE", targetId: "s1" });
    post.mockImplementation(() => fail(409));
    expect(await setServiceFavorite("s1", true)).toBe(true);
    post.mockImplementation(() => fail(500, "no"));
    await expect(setServiceFavorite("s1", true)).rejects.toThrow("no");
  });

  it("un-saves by the wishlist row id", async () => {
    get.mockImplementation(() => ok({ items: rows }));
    del.mockImplementation(() => ok(null));
    expect(await setServiceFavorite("s1", false)).toBe(false);
    expect(del).toHaveBeenCalledWith("/wishlist/w1");
  });
});
