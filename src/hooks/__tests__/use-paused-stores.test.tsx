// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

const get = vi.fn();
vi.mock("@/lib/api-client", () => ({ apiClient: { get: (...a: unknown[]) => get(...a) } }));

import { usePausedStores } from "../use-paused-stores";

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>{children}</QueryClientProvider>
);

const store = (acceptingOrders?: boolean) => Promise.resolve({ data: { acceptingOrders }, error: null });

describe("usePausedStores", () => {
  beforeEach(() => vi.clearAllMocks());

  it("picks out the stores that paused new orders", async () => {
    get.mockImplementation((path: string) => (path === "/vendors/v2" ? store(false) : store(true)));
    const { result } = renderHook(() => usePausedStores(["v1", "v2", "v1"]), { wrapper });

    await waitFor(() => expect([...result.current]).toEqual(["v2"]));
    expect(get).toHaveBeenCalledTimes(2); // v1 asked once
  });

  it("counts a store as open when the answer does not say otherwise", async () => {
    get.mockReturnValue(store(undefined));
    const { result } = renderHook(() => usePausedStores(["v1"]), { wrapper });

    await waitFor(() => expect(get).toHaveBeenCalled());
    expect(result.current.size).toBe(0);
  });

  it("never blocks a buyer because a lookup failed", async () => {
    get.mockReturnValue(Promise.resolve({ data: null, error: new Error("offline") }));
    const { result } = renderHook(() => usePausedStores(["v1"]), { wrapper });

    await waitFor(() => expect(get).toHaveBeenCalled());
    expect(result.current.size).toBe(0);
  });

  it("asks nothing when there are no stores", () => {
    renderHook(() => usePausedStores([]), { wrapper });
    expect(get).not.toHaveBeenCalled();
  });
});
