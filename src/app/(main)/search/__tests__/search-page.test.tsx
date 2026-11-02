// @vitest-environment jsdom
import { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

const nav = vi.hoisted(() => ({ search: "", replace: vi.fn() }));
vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(nav.search),
  useRouter: () => ({ replace: nav.replace, push: vi.fn() }),
  usePathname: () => "/search",
}));

// What the results query reports. With no search term it never runs, and a query that
// never runs is "pending" forever: the page must not wait on it.
const results = vi.hoisted(() => ({
  state: { data: undefined as unknown, isPending: true, isFetching: false, isError: false, error: null, refetch: () => {} },
}));
vi.mock("@/hooks/use-search", () => ({
  useGlobalSearch: () => results.state,
  useSearchSuggestions: () => ({ data: [], isFetching: false }),
}));

vi.mock("@/services/search", () => ({
  getTrendingSearches: () => [],
  getRecentSearches: () => [],
  addRecentSearch: vi.fn(),
  removeRecentSearch: vi.fn(),
  clearRecentSearches: vi.fn(),
}));
vi.mock("@/services/campus", () => ({ getCampuses: () => [] }));
vi.mock("@/components/search/SearchCategoryBrowse", () => ({ SearchCategoryBrowse: () => null }));
vi.mock("@/components/search/SearchEmptyState", () => ({ SearchEmptyState: () => <p>Nothing found</p> }));
vi.mock("@/components/marketplace/listing/Pagination", () => ({ Pagination: () => null }));

import SearchPage from "../page";

const box = () => screen.getByLabelText("Search Kampmax") as HTMLInputElement;
const type = (value: string) => fireEvent.change(box(), { target: { value } });
const wait = (ms: number) => act(() => void vi.advanceTimersByTime(ms));
const pending = { data: undefined, isPending: true, isFetching: false, isError: false, error: null, refetch: () => {} };

beforeEach(() => {
  vi.useFakeTimers();
  nav.search = "";
  nav.replace.mockClear();
  results.state = pending;
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("the search page with nothing to search for", () => {
  it("shows the start view, not a loading screen that never ends", () => {
    render(<SearchPage />);

    expect(screen.getByText(/Search across products, services/)).toBeTruthy();
    expect(screen.queryByRole("status", { name: "Loading search results" })).toBeNull();
  });

  it("says so when only a type has been chosen, and offers to search everything", () => {
    nav.search = "type=vendor";
    render(<SearchPage />);

    expect(screen.getByText(/Searching in/).textContent).toContain("Vendors");
    expect(screen.queryByRole("status", { name: "Loading search results" })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Search everything" }));
    expect(nav.replace).toHaveBeenCalledWith("/search", { scroll: false });
  });
});

describe("the search page with a search", () => {
  it("loads while the results are on their way", () => {
    nav.search = "q=shop";
    render(<SearchPage />);

    expect(screen.getByRole("status", { name: "Loading search results" })).toBeTruthy();
  });

  it("keeps what has been typed when a filter is clicked before the search reaches the address", () => {
    nav.search = "q=shop";
    results.state = { ...pending, isPending: false, data: { items: [], total: 0, totalPages: 1, query: "shop" } };
    const { rerender } = render(<SearchPage />);

    // Edited, but the pause hasn't passed yet, so the address still says "shop"...
    type("shops");
    // ...and a filter is clicked.
    fireEvent.click(screen.getByRole("tab", { name: "Vendors" }));

    expect(nav.replace).toHaveBeenCalledWith("/search?q=shops&type=vendor", { scroll: false });

    // The address then comes back with the filter; the typed text must survive it.
    nav.search = "q=shops&type=vendor";
    rerender(<SearchPage />);
    expect(box().value).toBe("shops");
  });

  it("writes the search to the address after a pause", () => {
    nav.search = "type=vendor";
    render(<SearchPage />);

    type("shop");
    wait(100);
    expect(nav.replace).not.toHaveBeenCalled();
    wait(400);

    expect(nav.replace).toHaveBeenCalledWith("/search?type=vendor&q=shop", { scroll: false });
  });

  it("follows a search changed from outside, such as the back button", () => {
    nav.search = "q=shop";
    const { rerender } = render(<SearchPage />);

    nav.search = "q=laptop";
    rerender(<SearchPage />);

    expect(box().value).toBe("laptop");
  });

  it("isn't thrown off when its own search comes back while more is being typed", () => {
    const { rerender } = render(<SearchPage />);

    type("lo");
    wait(500);
    expect(nav.replace).toHaveBeenCalledWith("/search?q=lo", { scroll: false });

    type("log"); // the person keeps typing...
    nav.search = "q=lo"; // ...and the address reports the earlier search
    rerender(<SearchPage />);

    expect(box().value).toBe("log");
  });
});
