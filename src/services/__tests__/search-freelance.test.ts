import { beforeEach, describe, expect, it, vi } from "vitest";

const api = vi.hoisted(() => ({
  fetchProducts: vi.fn(),
  fetchVendors: vi.fn(),
  fetchCategories: vi.fn(),
  fetchCampuses: vi.fn(),
  listPublicJobs: vi.fn(),
  listPublicServices: vi.fn(),
  searchProviders: vi.fn(),
  listEventsApi: vi.fn(),
  listArticles: vi.fn(),
  fetchPublicServices: vi.fn(),
  listPublicFreelancers: vi.fn(),
}));
vi.mock("@/services/products", () => ({ fetchProducts: api.fetchProducts }));
vi.mock("@/services/users", () => ({ fetchVendors: api.fetchVendors }));
vi.mock("@/services/categories", () => ({ fetchCategories: api.fetchCategories }));
vi.mock("@/services/campus", () => ({ fetchCampuses: api.fetchCampuses }));
vi.mock("@/services/jobs", () => ({ listPublicJobs: api.listPublicJobs }));
vi.mock("@/services/service-marketplace", () => ({
  listPublicServices: api.listPublicServices,
  searchProviders: api.searchProviders,
}));
vi.mock("@/services/event-tickets", () => ({ listEventsApi: api.listEventsApi }));
vi.mock("@/services/blog", () => ({ listArticles: api.listArticles }));
vi.mock("@/services/taxonomy", () => ({
  fetchTaxonomyTree: vi.fn().mockResolvedValue([]),
  cachedTaxonomyName: () => undefined,
}));
vi.mock("@/services/freelancer-services", () => ({ fetchPublicServices: api.fetchPublicServices }));
vi.mock("@/services/freelancer", () => ({ listPublicFreelancers: api.listPublicFreelancers }));

import { search } from "../search";

const ID = "4dede678-6936-4679-9e8b-6a1f9f00ac8b";

const freelanceService = {
  id: ID,
  slug: "logo-design",
  title: "Logo design pack",
  shortDescription: "A logo for your brand",
  skills: ["Branding"],
  price: 15000,
  coverImageUrl: "https://cdn.example.com/c.jpg",
  categoryName: "Design",
  freelancer: { id: "f1", name: "Ada Obi" },
  createdAt: "2026-05-01T00:00:00Z",
};

const freelancerProfile = {
  id: "f1",
  username: "adaobi",
  fullName: "Ada Obi",
  professionalTitle: "Brand designer",
  bio: "I make logos",
  avatar: null,
  city: "Ibadan",
  location: null,
  skills: [{ skillId: "s1", name: "Logo design" }],
};

beforeEach(() => {
  vi.clearAllMocks();
  api.fetchProducts.mockResolvedValue({ data: [], error: null });
  api.fetchVendors.mockResolvedValue({ data: [], error: null });
  api.fetchCategories.mockResolvedValue({ data: [], error: null });
  api.fetchCampuses.mockResolvedValue([]);
  api.listPublicJobs.mockResolvedValue({ jobs: [], error: null });
  api.listPublicServices.mockResolvedValue([]);
  api.searchProviders.mockResolvedValue([]);
  api.listEventsApi.mockResolvedValue({ items: [] });
  api.listArticles.mockResolvedValue({ items: [] });
  api.fetchPublicServices.mockResolvedValue({ items: [freelanceService], total: 1, totalPages: 1, failed: false });
  api.listPublicFreelancers.mockResolvedValue({ profiles: [freelancerProfile], error: null });
});

describe("search: freelancer services", () => {
  it("finds a freelancer's service and links to its own page", async () => {
    const result = await search("logo", { type: "freelance" });

    expect(api.fetchPublicServices).toHaveBeenCalledWith(expect.objectContaining({ q: "logo" }));
    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toMatchObject({
      type: "freelance",
      title: "Logo design pack",
      subtitle: "Ada Obi · Design",
      url: `/freelancers/services/logo-design-${ID}`,
      price: 15000,
    });
  });

  it("asks only the freelancer source when that type is chosen", async () => {
    await search("logo", { type: "freelance" });

    expect(api.fetchProducts).not.toHaveBeenCalled();
    expect(api.listPublicJobs).not.toHaveBeenCalled();
    expect(api.listPublicFreelancers).not.toHaveBeenCalled();
  });

  it("applies the price range to them", async () => {
    const result = await search("logo", { type: "freelance", priceMax: 10000 });

    expect(result.items).toEqual([]);
  });
});

describe("search: freelancers", () => {
  it("finds a freelancer by what they do, linking to their profile", async () => {
    const result = await search("brand", { type: "freelancer" });

    expect(result.items[0]).toMatchObject({
      type: "freelancer",
      title: "Ada Obi",
      subtitle: "Brand designer · Ibadan",
      url: "/freelancers/f1",
    });
  });

  it("finds one by a skill, even when the name and bio don't mention it", async () => {
    api.listPublicFreelancers.mockResolvedValue({
      profiles: [{ ...freelancerProfile, bio: null, professionalTitle: null, skills: [{ skillId: "s", name: "Illustration" }] }],
      error: null,
    });

    const result = await search("illustration", { type: "freelancer" });

    expect(result.items).toHaveLength(1);
  });
});

describe("search across everything", () => {
  it("includes both freelancer sources", async () => {
    const result = await search("logo");

    expect(result.items.map((i) => i.type).sort()).toEqual(["freelance", "freelancer"]);
  });

  it("still shows the rest, and says which source was missing, when freelancer services fail", async () => {
    api.fetchPublicServices.mockResolvedValue({ items: [], total: 0, totalPages: 1, failed: true });

    const result = await search("logo");

    expect(result.unavailable).toEqual(["freelance"]);
    expect(result.items.map((i) => i.type)).toEqual(["freelancer"]);
  });
});
