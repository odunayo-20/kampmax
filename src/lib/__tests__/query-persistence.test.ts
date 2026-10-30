// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import {
  persistQueryClientRestore,
  persistQueryClientSave,
} from "@tanstack/react-query-persist-client";
import type { AuthUser } from "@/types";
import { QUERY_CACHE_KEY, clearAuthTokens } from "../auth-storage";
import { setCurrentAuthUser } from "../current-user-store";
import {
  QUERY_CACHE_MAX_AGE_MS,
  createQueryPersistOptions,
  isPersistableQuery,
} from "../query-persistence";

const user = (id: string): AuthUser => ({
  id,
  name: id,
  email: `${id}@example.com`,
  phone: "",
  campusId: "c1",
  role: "student",
  avatar: "",
  isVerified: true,
});

describe("isPersistableQuery", () => {
  it("saves a successful dashboard query that belongs to the signed-in user", () => {
    expect(isPersistableQuery(["freelancer-dashboard", "overview", "u1"], "success", "u1")).toBe(true);
    expect(isPersistableQuery(["dashboard-access", "employer", "u1"], "success", "u1")).toBe(true);
    expect(isPersistableQuery(["employer-dashboard", "summary", "u1"], "success", "u1")).toBe(true);
  });

  it("skips queries that aren't successful", () => {
    expect(isPersistableQuery(["freelancer-dashboard", "overview", "u1"], "error", "u1")).toBe(false);
    expect(isPersistableQuery(["freelancer-dashboard", "overview", "u1"], "pending", "u1")).toBe(false);
  });

  it("skips queries outside the allow-list", () => {
    expect(isPersistableQuery(["wallet", "u1"], "success", "u1")).toBe(false);
    expect(isPersistableQuery(["messages", "unread", "u1"], "success", "u1")).toBe(false);
  });

  it("skips queries that don't carry the signed-in user's id", () => {
    // Another user's data, and keys with no user id at all (the vendor dashboard).
    expect(isPersistableQuery(["freelancer-dashboard", "overview", "u2"], "success", "u1")).toBe(false);
    expect(isPersistableQuery(["freelancer-dashboard", "overview", undefined], "success", "u1")).toBe(false);
    expect(isPersistableQuery(["vendor-dashboard", "analytics"], "success", "u1")).toBe(false);
  });

  it("saves nothing when nobody is signed in", () => {
    expect(isPersistableQuery(["freelancer-dashboard", "overview", "u1"], "success", undefined)).toBe(false);
  });
});

describe("saving and restoring the cache", () => {
  beforeEach(() => {
    localStorage.clear();
    setCurrentAuthUser(null);
  });

  function filledClient() {
    const client = new QueryClient();
    client.setQueryData(["freelancer-dashboard", "overview", "u1"], { headline: "Designer" });
    client.setQueryData(["dashboard-access", "employer", "u1"], { canUseDashboard: true });
    client.setQueryData(["freelancer-dashboard", "overview", "u2"], { headline: "Someone else" });
    client.setQueryData(["vendor-dashboard", "analytics"], { revenue: 10 });
    client.setQueryData(["wallet", "u1"], { balance: 5 });
    return client;
  }

  it("saves only the signed-in user's dashboard queries, and brings them back", async () => {
    setCurrentAuthUser(user("u1"));
    const { persister, dehydrateOptions } = createQueryPersistOptions();

    await persistQueryClientSave({ queryClient: filledClient(), persister, dehydrateOptions });

    const saved = JSON.parse(localStorage.getItem(QUERY_CACHE_KEY) ?? "{}");
    const savedKeys = saved.clientState.queries.map((q: { queryKey: unknown[] }) => q.queryKey);
    expect(savedKeys).toEqual([
      ["freelancer-dashboard", "overview", "u1"],
      ["dashboard-access", "employer", "u1"],
    ]);

    const fresh = new QueryClient();
    await persistQueryClientRestore({ queryClient: fresh, persister, maxAge: QUERY_CACHE_MAX_AGE_MS });
    expect(fresh.getQueryData(["freelancer-dashboard", "overview", "u1"])).toEqual({ headline: "Designer" });
    expect(fresh.getQueryData(["wallet", "u1"])).toBeUndefined();
    expect(fresh.getQueryData(["freelancer-dashboard", "overview", "u2"])).toBeUndefined();
  });

  it("saves no queries when nobody is signed in", async () => {
    const { persister, dehydrateOptions } = createQueryPersistOptions();

    await persistQueryClientSave({ queryClient: filledClient(), persister, dehydrateOptions });

    const saved = JSON.parse(localStorage.getItem(QUERY_CACHE_KEY) ?? "{}");
    expect(saved.clientState.queries).toEqual([]);
  });

  it("discards a saved cache that is too old", async () => {
    setCurrentAuthUser(user("u1"));
    const { persister, dehydrateOptions } = createQueryPersistOptions();
    await persistQueryClientSave({ queryClient: filledClient(), persister, dehydrateOptions });

    const saved = JSON.parse(localStorage.getItem(QUERY_CACHE_KEY) ?? "{}");
    saved.timestamp = Date.now() - QUERY_CACHE_MAX_AGE_MS - 1000;
    localStorage.setItem(QUERY_CACHE_KEY, JSON.stringify(saved));

    const fresh = new QueryClient();
    await persistQueryClientRestore({ queryClient: fresh, persister, maxAge: QUERY_CACHE_MAX_AGE_MS });
    expect(fresh.getQueryCache().getAll()).toHaveLength(0);
    expect(localStorage.getItem(QUERY_CACHE_KEY)).toBeNull();
  });

  it("is removed when the auth tokens are cleared", async () => {
    setCurrentAuthUser(user("u1"));
    const { persister, dehydrateOptions } = createQueryPersistOptions();
    await persistQueryClientSave({ queryClient: filledClient(), persister, dehydrateOptions });
    expect(localStorage.getItem(QUERY_CACHE_KEY)).not.toBeNull();

    clearAuthTokens();

    expect(localStorage.getItem(QUERY_CACHE_KEY)).toBeNull();
  });
});
