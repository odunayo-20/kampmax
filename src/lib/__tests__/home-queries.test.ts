import { beforeEach, describe, expect, it, vi } from "vitest";
import { QueryClient } from "@tanstack/react-query";

const api = vi.hoisted(() => ({
  fetchProducts: vi.fn(),
  fetchCategories: vi.fn(),
  fetchVendors: vi.fn(),
  listPublicServices: vi.fn(),
  listPublicJobs: vi.fn(),
  fetchPublicServices: vi.fn(),
  listEventsApi: vi.fn(),
}));
vi.mock("@/services/products", () => ({ fetchProducts: api.fetchProducts }));
vi.mock("@/services/categories", () => ({ fetchCategories: api.fetchCategories }));
vi.mock("@/services/users", () => ({ fetchVendors: api.fetchVendors }));
vi.mock("@/services/service-marketplace", () => ({ listPublicServices: api.listPublicServices }));
vi.mock("@/services/jobs", () => ({ listPublicJobs: api.listPublicJobs }));
vi.mock("@/services/freelancer-services", () => ({ fetchPublicServices: api.fetchPublicServices }));
vi.mock("@/services/event-tickets", () => ({ listEventsApi: api.listEventsApi }));

import { eventsListQuery } from "@/services/event-queries";
import { homeKeys, homeQueries, prefetchHome, toApiCampusId } from "../home-queries";

const server = () => new QueryClient({ defaultOptions: { queries: { retry: false } } });

beforeEach(() => {
  api.fetchProducts.mockResolvedValue({ data: [{ id: "p1" }], error: null });
  api.fetchCategories.mockResolvedValue({ data: [{ id: "c1" }], error: null });
  api.fetchVendors.mockResolvedValue({ data: [{ id: "v1" }], error: null });
  api.listPublicServices.mockResolvedValue([{ id: "s1" }]);
  api.listPublicJobs.mockResolvedValue({ jobs: [], error: null });
  api.fetchPublicServices.mockResolvedValue({ items: [{ id: "f1" }], failed: false });
  api.listEventsApi.mockResolvedValue({ items: [{ id: "e1" }], meta: { total: 1 } });
});

describe("prefetchHome", () => {
  it("fills the cache under the keys the page's hooks ask for", async () => {
    const queryClient = server();

    await prefetchHome(queryClient);

    expect(queryClient.getQueryData(homeKeys.products())).toEqual([{ id: "p1" }]);
    expect(queryClient.getQueryData(homeKeys.services())).toEqual([{ id: "s1" }]);
    expect(queryClient.getQueryData(homeKeys.categories)).toEqual([{ id: "c1" }]);
    expect(queryClient.getQueryData(homeKeys.vendors())).toEqual([{ id: "v1" }]);
    expect(queryClient.getQueryData(homeKeys.freelance)).toEqual([{ id: "f1" }]);
    expect(queryClient.getQueryData(homeQueries.events().queryKey)).toEqual({ items: [{ id: "e1" }], meta: { total: 1 } });
  });

  it("never throws, and leaves a failing source out so the browser can fetch it", async () => {
    api.fetchProducts.mockResolvedValue({ data: [], error: new Error("down") });
    api.listEventsApi.mockRejectedValue(new Error("down"));
    const queryClient = server();

    await expect(prefetchHome(queryClient)).resolves.toBeUndefined();

    expect(queryClient.getQueryData(homeKeys.products())).toBeUndefined();
    expect(queryClient.getQueryData(homeQueries.events().queryKey)).toBeUndefined();
    expect(queryClient.getQueryData(homeKeys.services())).toEqual([{ id: "s1" }]);
  });

  it("does not wait for a source that never answers", async () => {
    api.fetchVendors.mockReturnValue(new Promise(() => {}));
    const queryClient = server();
    const started = Date.now();

    await prefetchHome(queryClient, 60);

    expect(Date.now() - started).toBeLessThan(1000);
    expect(queryClient.getQueryData(homeKeys.vendors())).toBeUndefined();
    expect(queryClient.getQueryData(homeKeys.products())).toEqual([{ id: "p1" }]);
  });
});

describe("home query definitions", () => {
  it("asks for the same events list as the events hook, so the server's data is found", () => {
    expect(homeQueries.events("").queryKey).toEqual(eventsListQuery({ limit: 10 }).queryKey);
  });

  it("keys a campus list apart from the all-campuses one the server prefetches", () => {
    const campus = "5c8e5a2e-3b1a-4f0e-9a39-0c3a1d6a1111";

    expect(homeQueries.products(campus).queryKey).not.toEqual(homeQueries.products().queryKey);
    // A seed id that isn't a real campus is treated as no campus: the same list, the same key.
    expect(homeQueries.products("oau").queryKey).toEqual(homeQueries.products().queryKey);
    expect(toApiCampusId("oau")).toBeUndefined();
  });
});
