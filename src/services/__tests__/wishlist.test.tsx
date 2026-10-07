// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

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

let auth: { user: { id: string } | null; status: string } = { user: { id: "u1" }, status: "authenticated" };
vi.mock("@/lib/auth-context", () => ({ useAuth: () => auth }));

import { fetchWishlist, useWishlist } from "../wishlist";

const ok = <T,>(data: T) => Promise.resolve({ data, error: null });
const fail = (status: number, message = "x") =>
  Promise.resolve({ data: null, error: Object.assign(new Error(message), { status }) });

const product = (id: string) => ({
  id,
  name: "Phone",
  price: 1000,
  compareAtPrice: null,
  image: null,
  condition: "NEW",
  stockQuantity: 2,
  vendorId: "v1",
  status: "ACTIVE",
  available: true,
});
const entry = (id: string, targetId: string) => ({
  id,
  targetType: "PRODUCT",
  targetId,
  createdAt: "2026-10-07T10:00:00Z",
  product: product(targetId),
});

let client: QueryClient;
function wrapper() {
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
const cachedIds = () =>
  (client.getQueryData(["wishlist", "u1"]) as { items: { id: string }[] } | undefined)?.items.map((i) => i.id) ?? [];

beforeEach(() => {
  vi.clearAllMocks();
  auth = { user: { id: "u1" }, status: "authenticated" };
});

describe("fetchWishlist", () => {
  it("returns the server's list, and an error with nothing made up when it can't load", async () => {
    get.mockImplementation(() => ok({ total: 1, items: [entry("w1", "p1")] }));
    expect((await fetchWishlist()).items).toHaveLength(1);
    get.mockImplementation(() => fail(500, "down"));
    const res = await fetchWishlist();
    expect(res.error).not.toBeNull();
    expect(res.items).toEqual([]);
  });
});

describe("useWishlist", () => {
  it("knows which products are saved", async () => {
    get.mockImplementation(() => ok({ total: 1, items: [entry("w1", "p1")] }));
    const { result } = renderHook(() => useWishlist(), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.has("p1")).toBe(true);
    expect(result.current.has("p2")).toBe(false);
  });

  it("saves a product, filling the heart straight away and keeping the server's record", async () => {
    get.mockImplementation(() => ok({ total: 0, items: [] }));
    post.mockImplementation(() => ok(entry("w9", "p2")));
    const { result } = renderHook(() => useWishlist(), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.loading).toBe(false));

    let outcome;
    await act(async () => {
      outcome = await result.current.toggle("p2");
    });
    expect(outcome).toEqual({ ok: true, saved: true });
    expect(post).toHaveBeenCalledWith("/wishlist", { targetType: "PRODUCT", targetId: "p2" });
    await waitFor(() => expect(result.current.items.map((i) => i.id)).toEqual(["w9"]));
  });

  it("undoes the heart when the server refuses", async () => {
    get.mockImplementation(() => ok({ total: 0, items: [] }));
    post.mockImplementation(() => fail(500));
    const { result } = renderHook(() => useWishlist(), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.loading).toBe(false));

    let outcome: { ok: boolean; error?: string } | undefined;
    await act(async () => {
      outcome = await result.current.toggle("p2");
    });
    expect(outcome?.ok).toBe(false);
    expect(outcome?.error).toBeTruthy();
    // The heart that was filled optimistically is taken back, not left standing.
    expect(cachedIds()).toEqual([]);
    await waitFor(() => expect(result.current.has("p2")).toBe(false));
  });

  it("removes a saved product by its record id, and restores it if that fails", async () => {
    get.mockImplementation(() => ok({ total: 1, items: [entry("w1", "p1")] }));
    del.mockImplementation(() => ok(undefined));
    const { result } = renderHook(() => useWishlist(), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.remove("p1");
    });
    expect(del).toHaveBeenCalledWith("/wishlist/w1");
    await waitFor(() => expect(result.current.has("p1")).toBe(false));
  });

  it("keeps the product saved when removing it fails", async () => {
    get.mockImplementation(() => ok({ total: 1, items: [entry("w1", "p1")] }));
    del.mockImplementation(() => fail(500));
    const { result } = renderHook(() => useWishlist(), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.loading).toBe(false));

    let outcome: { ok: boolean } | undefined;
    await act(async () => {
      outcome = await result.current.remove("p1");
    });
    expect(outcome?.ok).toBe(false);
    // The item that was removed optimistically is put back.
    expect(cachedIds()).toEqual(["w1"]);
    await waitFor(() => expect(result.current.has("p1")).toBe(true));
  });

  it("asks a signed-out visitor to sign in instead of pretending to save", async () => {
    auth = { user: null, status: "unauthenticated" };
    const { result } = renderHook(() => useWishlist(), { wrapper: wrapper() });
    let outcome;
    await act(async () => {
      outcome = await result.current.toggle("p1");
    });
    expect(outcome).toEqual({ ok: false, needsLogin: true });
    expect(get).not.toHaveBeenCalled();
    expect(post).not.toHaveBeenCalled();
  });
});
