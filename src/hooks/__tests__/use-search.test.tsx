// @vitest-environment jsdom
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";

const api = vi.hoisted(() => ({ search: vi.fn(), getSuggestions: vi.fn() }));
vi.mock("@/services/search", () => ({ search: api.search, getSuggestions: api.getSuggestions }));

import { useGlobalSearch, useSearchSuggestions } from "../use-search";

// No auth provider here, as for a visitor who isn't signed in: search must still work.
const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    {children}
  </QueryClientProvider>
);

describe("search for a visitor who isn't signed in", () => {
  it("runs the search", async () => {
    api.search.mockResolvedValue({ query: "logo", items: [], total: 0, page: 1, pageSize: 12, totalPages: 1, suggestions: [] });

    const { result } = renderHook(() => useGlobalSearch({ q: "logo" }), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(api.search).toHaveBeenCalledWith("logo", expect.objectContaining({ page: 1 }));
  });

  it("offers suggestions once there are enough letters", async () => {
    api.getSuggestions.mockResolvedValue([{ text: "logo design", type: "query" }]);

    const { result } = renderHook(() => useSearchSuggestions("lo"), { wrapper });

    await waitFor(() => expect(result.current.data).toEqual([{ text: "logo design", type: "query" }]));
  });

  it("does nothing for an empty search or a single letter", () => {
    api.search.mockClear();
    api.getSuggestions.mockClear();

    renderHook(() => useGlobalSearch({ q: "   " }), { wrapper });
    renderHook(() => useSearchSuggestions("l"), { wrapper });

    expect(api.search).not.toHaveBeenCalled();
    expect(api.getSuggestions).not.toHaveBeenCalled();
  });
});
