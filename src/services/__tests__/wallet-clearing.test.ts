import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock("@/lib/api-client", () => ({ apiClient: { get: mocks.get, post: vi.fn(), delete: vi.fn() } }));

import { availableOf, fetchMyWalletBalance, mapBackendWalletToFrontend, type BackendWalletResponse } from "../wallet";

const raw = (over: Partial<BackendWalletResponse> = {}): BackendWalletResponse => ({
  id: "w1",
  ownerType: "USER",
  userId: "u1",
  vendorId: null,
  currency: "NGN",
  balance: 500,
  heldBalance: 300,
  availableBalance: 200,
  clearing: [{ amount: 300, releaseAt: "2026-11-08T09:00:00.000Z" }],
  status: "ACTIVE",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  ...over,
});

beforeEach(() => mocks.get.mockReset());

describe("what counts as available", () => {
  it("uses the backend's available figure", () => {
    expect(availableOf(raw())).toBe(200);
  });

  it("falls back to balance minus what is clearing for a backend that does not send it", () => {
    expect(availableOf(raw({ availableBalance: undefined }))).toBe(200);
  });

  it("is never negative", () => {
    expect(availableOf(raw({ availableBalance: undefined, balance: 50, heldBalance: 300 }))).toBe(0);
  });
});

describe("the wallet as the app sees it", () => {
  it("makes `balance` what can be used now, and shows clearing earnings apart", () => {
    const wallet = mapBackendWalletToFrontend(raw());
    expect(wallet.balance).toBe(200);
    expect(wallet.pendingAmount).toBe(300);
    expect(wallet.clearing).toEqual([{ amount: 300, releaseAt: "2026-11-08T09:00:00.000Z" }]);
  });

  it("accepts dates sent as Date objects, and a wallet with nothing clearing", () => {
    const withDate = mapBackendWalletToFrontend(raw({ clearing: [{ amount: 1, releaseAt: new Date("2026-11-08T09:00:00Z") }] }));
    expect(withDate.clearing).toEqual([{ amount: 1, releaseAt: "2026-11-08T09:00:00.000Z" }]);

    const plain = mapBackendWalletToFrontend(raw({ heldBalance: 0, availableBalance: 500, clearing: undefined }));
    expect(plain.balance).toBe(500);
    expect(plain.clearing).toEqual([]);
  });
});

describe("fetchMyWalletBalance", () => {
  it("reports what can be used now, so a 'balance too low' check never counts clearing earnings", async () => {
    mocks.get.mockResolvedValue({ data: raw(), error: null });
    await expect(fetchMyWalletBalance()).resolves.toEqual({ balance: 200, currency: "NGN" });
  });
});
