import { beforeEach, describe, expect, it, vi } from "vitest";

const fetchProducts = vi.fn();
const fetchVendors = vi.fn();
const fetchCategories = vi.fn();
const fetchCampuses = vi.fn();
const listPublicJobs = vi.fn();
const listPublicServices = vi.fn();
const listEventsApi = vi.fn();
const listArticles = vi.fn();
const searchProviders = vi.fn();

vi.mock("@/services/products", () => ({ fetchProducts: (...a: unknown[]) => fetchProducts(...a) }));
vi.mock("@/services/users", () => ({ fetchVendors: (...a: unknown[]) => fetchVendors(...a) }));
vi.mock("@/services/categories", () => ({ fetchCategories: (...a: unknown[]) => fetchCategories(...a) }));
vi.mock("@/services/campus", () => ({ fetchCampuses: (...a: unknown[]) => fetchCampuses(...a) }));
vi.mock("@/services/jobs", () => ({ listPublicJobs: (...a: unknown[]) => listPublicJobs(...a) }));
vi.mock("@/services/service-marketplace", () => ({
  listPublicServices: (...a: unknown[]) => listPublicServices(...a),
  searchProviders: (...a: unknown[]) => searchProviders(...a),
}));
vi.mock("@/services/event-tickets", () => ({ listEventsApi: (...a: unknown[]) => listEventsApi(...a) }));
vi.mock("@/services/blog", () => ({ listArticles: (...a: unknown[]) => listArticles(...a) }));
vi.mock("@/services/taxonomy", () => ({
  fetchTaxonomyTree: vi.fn().mockResolvedValue([]),
  cachedTaxonomyName: (id: string) => (id === "svc-cat" ? "Repairs" : undefined),
}));
vi.mock("@/lib/job-api-mapping", () => ({
  jobToOpportunity: (j: { id: string; title: string }) => ({
    id: j.id,
    title: j.title,
    summary: `${j.title} summary`,
    skills: [],
    categoryName: "Design",
    employer: { name: "Acme", verified: true },
    location: {},
    postedAt: "2026-01-01T00:00:00Z",
  }),
}));

import { getSuggestions, search } from "../search";

const ok = <T>(data: T) => ({ data, total: 1, page: 1, limit: 30, totalPages: 1, error: null });
const product = {
  id: "p1",
  title: "Phone charger",
  description: "Fast charger",
  price: 5000,
  condition: "New",
  location: "",
  campusId: "campus-1",
  images: [],
  tags: ["charger"],
  createdAt: "2026-02-01T00:00:00Z",
};

beforeEach(() => {
  vi.clearAllMocks();
  fetchCampuses.mockResolvedValue(ok([{ id: "campus-1", abbreviation: "UNILAG", name: "University of Lagos" }]));
  fetchProducts.mockResolvedValue(ok([product]));
  fetchVendors.mockResolvedValue(ok([]));
  fetchCategories.mockResolvedValue(ok([]));
  listPublicJobs.mockResolvedValue({ jobs: [], total: 0, page: 1, totalPages: 1, error: null });
  listPublicServices.mockResolvedValue([]);
  searchProviders.mockResolvedValue([]);
  listEventsApi.mockResolvedValue({ items: [], meta: {} });
  listArticles.mockResolvedValue({ items: [] });
});

describe("live global search", () => {
  it("returns nothing for an empty query without calling any API", async () => {
    const result = await search("   ");
    expect(result.total).toBe(0);
    expect(fetchProducts).not.toHaveBeenCalled();
  });

  it("merges live results from several verticals, ranked by relevance", async () => {
    listPublicJobs.mockResolvedValue({
      jobs: [{ id: "j1", title: "Charger repair helper" }],
      total: 1,
      page: 1,
      totalPages: 1,
      error: null,
    });
    listPublicServices.mockResolvedValue([
      { id: "s1", name: "Charger repairs", description: "We fix", categoryId: "svc-cat", pricingModel: "fixed", price: 2000, createdAt: "2026-01-01" },
    ]);

    const result = await search("charger");

    expect(result.items.map((i) => i.type).sort()).toEqual(["job", "product", "service"]);
    const service = result.items.find((i) => i.type === "service")!;
    expect(service.subtitle).toBe("Repairs"); // a real category name, not an id
    expect(result.unavailable).toBeUndefined();
  });

  it("names the provider on a service and can find providers themselves", async () => {
    listPublicServices.mockResolvedValue([
      { id: "s1", name: "Charger repairs", description: "We fix", categoryId: "svc-cat", pricingModel: "fixed", price: 2000, createdAt: "2026-01-01", provider: { id: "pr1", slug: "fix-it", displayName: "Fix It Fast", verified: true } },
    ]);
    searchProviders.mockResolvedValue([
      { id: "pr1", slug: "fix-it", displayName: "Charger Doctor", bio: "We repair chargers", verified: true },
    ]);

    const result = await search("charger");

    const service = result.items.find((i) => i.type === "service")!;
    expect(service.subtitle).toBe("Fix It Fast · Repairs");
    const provider = result.items.find((i) => i.type === "provider")!;
    expect(provider).toMatchObject({ title: "Charger Doctor", url: "/services/providers/pr1" });
  });

  it("asks the product API for live listings only, with the price range", async () => {
    await search("charger", { type: "product", priceMin: 1000, priceMax: 9000 });
    expect(fetchProducts).toHaveBeenCalledWith(
      expect.objectContaining({ search: "charger", status: "ACTIVE", minPrice: 1000, maxPrice: 9000 })
    );
    expect(listPublicJobs).not.toHaveBeenCalled(); // other types aren't queried
  });

  it("never sends a non-UUID campus id to the API", async () => {
    await search("charger", { type: "product", campusId: "unilag" });
    expect(fetchProducts).toHaveBeenCalledWith(expect.objectContaining({ campusId: undefined }));
  });

  it("labels results with the campus name, never a raw id", async () => {
    const result = await search("charger", { type: "product" });
    expect(result.items[0].subtitle).toContain("UNILAG");
    expect(result.items[0].subtitle).not.toContain("campus-1");
  });

  it("keeps the other results and reports a vertical that could not load", async () => {
    listPublicServices.mockRejectedValue(new Error("down"));

    const result = await search("charger");

    expect(result.items.map((i) => i.type)).toEqual(["product"]);
    expect(result.unavailable).toEqual(["service"]);
  });

  it("fails when every vertical fails, instead of claiming no results", async () => {
    fetchProducts.mockResolvedValue({ ...ok([]), error: new Error("down") });
    fetchVendors.mockResolvedValue({ ...ok([]), error: new Error("down") });
    fetchCategories.mockResolvedValue({ ...ok([]), error: new Error("down") });
    listPublicJobs.mockResolvedValue({ jobs: [], total: 0, page: 1, totalPages: 1, error: new Error("down") });
    listPublicServices.mockRejectedValue(new Error("down"));
    searchProviders.mockRejectedValue(new Error("down"));
    listEventsApi.mockRejectedValue(new Error("down"));
    listArticles.mockRejectedValue(new Error("down"));

    await expect(search("charger")).rejects.toThrow();
  });

  it("puts boosted (sponsored) products first on relevance", async () => {
    fetchProducts.mockResolvedValue(
      ok([
        { ...product, id: "plain", title: "Charger" },
        { ...product, id: "boosted", title: "Charger deluxe", sponsored: true },
      ])
    );
    const result = await search("charger", { type: "product" });
    expect(result.items[0].id).toBe("boosted");
  });

  it("sorts by price when asked", async () => {
    fetchProducts.mockResolvedValue(
      ok([
        { ...product, id: "dear", price: 9000 },
        { ...product, id: "cheap", price: 1000 },
      ])
    );
    const result = await search("charger", { type: "product", sort: "price_low" });
    expect(result.items.map((i) => i.id)).toEqual(["cheap", "dear"]);
  });
});

describe("live suggestions", () => {
  it("dedupes live titles and tags, and tolerates a failing source", async () => {
    listPublicServices.mockRejectedValue(new Error("down"));
    fetchCategories.mockResolvedValue(ok([{ id: "c1", name: "Chargers" }]));

    const suggestions = await getSuggestions("charger");

    expect(suggestions.map((s) => s.text)).toEqual(["Chargers", "Phone charger", "charger"]);
    expect(suggestions.find((s) => s.text === "charger")?.type).toBe("query");
  });

  it("returns nothing for a blank query", async () => {
    await expect(getSuggestions("  ")).resolves.toEqual([]);
  });
});
