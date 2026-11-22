// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

const get = vi.fn();
const patch = vi.fn();
vi.mock("@/lib/api-client", () => ({
  apiClient: { get: (...a: unknown[]) => get(...a), patch: (...a: unknown[]) => patch(...a), post: vi.fn(), delete: vi.fn() },
}));
vi.mock("@/lib/auth-context", () => ({ useAuth: () => ({ user: { id: "u1" }, status: "authenticated" }) }));
vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

import { FollowedStoreList } from "../FollowedStoreList";
import { useFollowedStores } from "@/hooks/use-store-follow";
import { fetchFollowedStores, setStoreMuted, type FollowedStore } from "@/services/storefront";

const store = (over: Partial<FollowedStore> = {}): FollowedStore => ({
  id: "v1",
  slug: "ada-kicks",
  storeName: "Ada Kicks",
  logo: null,
  verified: true,
  muted: false,
  newItems: 2,
  ...over,
});

/** Like the page: the list is drawn from the query, so a change to the cache shows in the rows. */
function Harness() {
  return <FollowedStoreList stores={useFollowedStores().data ?? []} />;
}

function renderList(stores: FollowedStore[]) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  client.setQueryData(["storefront", "followed", "u1"], stores);
  return render(
    <QueryClientProvider client={client}>
      <Harness />
    </QueryClientProvider>
  );
}

describe("followed stores", () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(cleanup);

  it("lists the stores you follow, newest first as given", async () => {
    get.mockResolvedValue({ data: [store()], error: null });
    await expect(fetchFollowedStores()).resolves.toEqual([store()]);
    expect(get).toHaveBeenCalledWith("/vendors/me/following");
  });

  it("mutes through the store's follow endpoint", async () => {
    patch.mockResolvedValue({ data: { muted: true }, error: null });
    await expect(setStoreMuted("v1", true)).resolves.toEqual({ muted: true });
    expect(patch).toHaveBeenCalledWith("/vendors/v1/follow", { muted: true });
  });

  it("shows each store with what is new, linking to it", () => {
    renderList([store()]);
    expect(screen.getByText("Ada Kicks")).toBeTruthy();
    expect(screen.getByText("2 new items this week")).toBeTruthy();
    expect(screen.getByRole("link").getAttribute("href")).toBe("/store/ada-kicks");
  });

  it("mutes a store from its bell, and says so in the row", async () => {
    patch.mockResolvedValue({ data: { muted: true }, error: null });
    get.mockResolvedValue({ data: [store({ muted: true })], error: null }); // what the refetch after muting returns
    renderList([store()]);
    fireEvent.click(screen.getByRole("button", { name: "Mute news from Ada Kicks" }));
    await waitFor(() => expect(patch).toHaveBeenCalledWith("/vendors/v1/follow", { muted: true }));
    await waitFor(() => expect(screen.getByText("News off")).toBeTruthy());
  });

  it("puts the bell back and shows the reason when the server refuses", async () => {
    patch.mockResolvedValue({ data: null, error: new Error("You are not following this store") });
    get.mockResolvedValue({ data: [store()], error: null });
    renderList([store()]);
    fireEvent.click(screen.getByRole("button", { name: "Mute news from Ada Kicks" }));
    await waitFor(() => expect(screen.getByRole("alert").textContent).toContain("not following"));
    expect(screen.getByText("2 new items this week")).toBeTruthy();
  });
});
