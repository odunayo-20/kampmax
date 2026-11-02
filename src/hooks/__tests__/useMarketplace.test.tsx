// @vitest-environment jsdom
import type { ReactNode } from "react";
import { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook } from "@testing-library/react";

const nav = vi.hoisted(() => ({ search: "", replace: vi.fn() }));
vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(nav.search),
  useRouter: () => ({ replace: nav.replace }),
  usePathname: () => "/marketplace",
}));

const api = vi.hoisted(() => ({ fetchProducts: vi.fn(), fetchCategories: vi.fn() }));
vi.mock("@/services/products", () => ({ fetchProducts: api.fetchProducts }));
vi.mock("@/services/categories", () => ({ fetchCategories: api.fetchCategories }));

import { useMarketplace } from "../useMarketplace";

const CAMPUS = "5c8e5a2e-3b1a-4f0e-9a39-0c3a1d6a1111";

function setup(campusId?: string) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return renderHook(() => useMarketplace(campusId), { wrapper });
}

const settle = (ms = 400) => act(async () => void (await vi.advanceTimersByTimeAsync(ms)));

beforeEach(() => {
  vi.useFakeTimers();
  nav.search = "";
  nav.replace.mockClear();
  api.fetchProducts.mockReset().mockResolvedValue({ data: [], total: 0, page: 1, totalPages: 1, error: null });
  api.fetchCategories.mockReset().mockResolvedValue({ data: [], error: null });
});
afterEach(() => vi.useRealTimers());

describe("useMarketplace and the address", () => {
  it("starts from the filters in the address", () => {
    nav.search = "category=k1&minPrice=500&sort=price_low";

    const { result } = setup();

    expect(result.current.filters).toMatchObject({ categoryId: "k1", minPrice: "500", sort: "price_low" });
    expect(result.current.activeFilterCount).toBe(2);
  });

  it("writes a filter to the address once it has settled, not before", async () => {
    const { result } = setup();

    act(() => result.current.setCategoryId("k1"));
    expect(nav.replace).not.toHaveBeenCalled();

    await settle();
    expect(nav.replace).toHaveBeenCalledTimes(1);
    expect(nav.replace).toHaveBeenCalledWith("/marketplace?category=k1", { scroll: false });
  });

  it("writes the plain path when every filter is cleared", async () => {
    nav.search = "category=k1";
    const { result } = setup();

    act(() => result.current.clearFilters());
    await settle();

    expect(nav.replace).toHaveBeenCalledWith("/marketplace", { scroll: false });
  });

  it("is not thrown off when its own change comes back as an address change", async () => {
    const { result, rerender } = setup();

    act(() => result.current.updateFilter("search", "lo"));
    await settle();
    expect(nav.replace).toHaveBeenCalledWith("/marketplace?q=lo", { scroll: false });

    // The person keeps typing while the address catches up...
    act(() => result.current.updateFilter("search", "log"));
    // ...and the address reports the earlier search.
    nav.search = "q=lo";
    rerender();

    expect(result.current.filters.search).toBe("log");
  });

  it("follows a link to a different category from elsewhere", () => {
    const { result, rerender } = setup();

    nav.search = "category=k2&vendor=v9";
    rerender();

    expect(result.current.filters).toMatchObject({ categoryId: "k2", vendorId: "v9" });
  });
});

describe("useMarketplace searching", () => {
  it("waits for a pause in typing a price instead of searching on every digit", async () => {
    const { result } = setup();
    await settle();
    api.fetchProducts.mockClear();

    for (const typed of ["5", "50", "500"]) {
      act(() => result.current.updateFilter("minPrice", typed));
      await settle(100);
    }
    expect(api.fetchProducts).not.toHaveBeenCalled();

    await settle();
    expect(api.fetchProducts).toHaveBeenCalledTimes(1);
    expect(api.fetchProducts.mock.calls[0][0]).toMatchObject({ minPrice: 500 });
  });

  it("searches straight away for a choice such as a sort", async () => {
    const { result } = setup();
    await settle();
    api.fetchProducts.mockClear();

    act(() => result.current.updateFilter("sort", "price_low"));
    await settle(50);

    expect(api.fetchProducts).toHaveBeenCalledTimes(1);
    expect(api.fetchProducts.mock.calls[0][0]).toMatchObject({ sort: "price_low" });
  });
});

describe("useMarketplace and the visitor's campus", () => {
  it("doesn't count their own campus as a filter they chose", () => {
    const { result } = setup(CAMPUS);

    expect(result.current.filters.campusId).toBe(CAMPUS);
    expect(result.current.activeFilterCount).toBe(0);
  });

  it("counts another campus, and writes it to the address", async () => {
    const { result } = setup(CAMPUS);

    act(() => result.current.updateFilter("campusId", "other-campus"));
    await settle();

    expect(result.current.activeFilterCount).toBe(1);
    expect(nav.replace).toHaveBeenCalledWith("/marketplace?campus=other-campus", { scroll: false });
  });

  it("leaves a campus chosen in the address alone when their own campus loads later", () => {
    nav.search = "campus=all";
    const { result, rerender } = renderHook(({ campus }) => useMarketplace(campus), {
      initialProps: { campus: undefined as string | undefined },
      wrapper: ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={new QueryClient()}>{children}</QueryClientProvider>
      ),
    });

    rerender({ campus: CAMPUS });

    expect(result.current.filters.campusId).toBe("");
  });
});
