// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const authState: { user: { id: string } | null } = { user: null };
vi.mock("@/lib/auth-context", () => ({ useAuth: () => authState }));

import { QueryCacheOwnerGuard } from "../QueryCacheOwnerGuard";

afterEach(cleanup);

function setup() {
  const client = new QueryClient();
  client.setQueryData(["freelancer-dashboard", "overview", "u1"], { headline: "Designer" });
  // A new element each time: re-rendering the same element object would be skipped.
  const tree = () => (
    <QueryClientProvider client={client}>
      <QueryCacheOwnerGuard />
    </QueryClientProvider>
  );
  const view = render(tree());
  const rerender = () => view.rerender(tree());
  return { client, rerender };
}

describe("QueryCacheOwnerGuard", () => {
  it("keeps the cache while the session is restored (nobody → user)", () => {
    authState.user = null;
    const { client, rerender } = setup();

    authState.user = { id: "u1" };
    rerender();

    expect(client.getQueryData(["freelancer-dashboard", "overview", "u1"])).toBeDefined();
  });

  it("empties the cache on sign-out", () => {
    authState.user = { id: "u1" };
    const { client, rerender } = setup();

    authState.user = null;
    rerender();

    expect(client.getQueryCache().getAll()).toHaveLength(0);
  });

  it("empties the cache when a different user signs in", () => {
    authState.user = { id: "u1" };
    const { client, rerender } = setup();

    authState.user = { id: "u2" };
    rerender();

    expect(client.getQueryCache().getAll()).toHaveLength(0);
  });

  it("leaves the cache alone when the same user is re-confirmed", () => {
    authState.user = { id: "u1" };
    const { client, rerender } = setup();

    authState.user = { id: "u1" };
    rerender();

    expect(client.getQueryData(["freelancer-dashboard", "overview", "u1"])).toBeDefined();
  });
});
