import { beforeEach, describe, expect, it } from "vitest";
import { createVendorManagementService } from "@/services/admin/vendor-management.mock";
import { resetVendorAdminState } from "@/data/admin/vendor-management";

// ------------------------------------------------------------
// VENDOR MANAGEMENT SERVICE TESTS
//
// The service re-derives every record from the real vendor stores
// (users, storefronts, products, reviews, orders, payouts), so
// assertions are written against known seeds:
//   - v1 TechHub Owo    → verified/active, real TH ledger, 9 products,
//                         15 reviews, 8 order rows, GMV ×2,854,000
//   - v2 StyleByChi     → verified/active, 1 vendor-order slice
//   - v3 CampusBites    → verified/active, 3 marketplace orders
//   - v4 IfeBookStore   → verified/active, NO ledger rows -> nulls
//   - v5 OAU Merch Shop → PENDING verification (storefront "pending")
//   - v6 UI Gadgets     → verified/active, no orders -> null sales
//   - v7 Lagos Mall     → verified / deactivated (temporarily_unavailable)
//   - v8 Adebayo's      → verified/active, 19 order slices + the only
//                         real payouts (INITIAL_PAYOUTS)
//
// Mutations write through the overlay; resetVendorAdminState()
// restores the pristine baseline so tests stay deterministic.
// ------------------------------------------------------------

const svc = createVendorManagementService();

beforeEach(() => {
  resetVendorAdminState();
});

describe("list", () => {
  it("returns every managed vendor with honest console fields", async () => {
    const page = await svc.list();
    expect(page.total).toBe(8);
    expect(page.page).toBe(1);
    expect(page.items.length).toBe(8);

    const v1 = page.items.find((v) => v.id === "v1");
    expect(v1?.storeName).toBe("TechHub Owo");
    expect(v1?.verificationStatus).toBe("verified");
    expect(v1?.storeStatus).toBe("active");
    expect(v1?.totalSales).toBe(2_854_000);

    for (const item of page.items) {
      expect(item.id).toBeTruthy();
      expect(["pending_verification", "verified", "rejected", "suspended", "deactivated"]).toContain(item.verificationStatus);
      if (item.ordersCount === 0) expect(item.fulfillmentRate).toBeNull();
      expect(["active", "suspended", "deactivated"]).toContain(item.storeStatus);
    }
  });

  it("buckets by queue exactly like the seed state", async () => {
    const pending = await svc.list({ queue: "pending_verification" });
    expect(pending.items.map((v) => v.id)).toEqual(["v5"]);

    const verified = await svc.list({ queue: "verified" });
    expect(verified.items.map((v) => v.id).sort()).toEqual(["v1", "v2", "v3", "v4", "v6", "v8"]);

    const deactivated = await svc.list({ queue: "deactivated" });
    expect(deactivated.items.map((v) => v.id)).toEqual(["v7"]);
  });

  it("filters by campus and category", async () => {
    const rugipo = await svc.list({ campusId: "rugipo" });
    expect(rugipo.items.map((v) => v.id).sort()).toEqual(["v1", "v2", "v3", "v8"]);
    expect(rugipo.items.every((v) => v.campusId === "rugipo")).toBe(true);

    const ui = await svc.list({ campusId: "ui" });
    expect(ui.items.map((v) => v.id)).toEqual(["v6"]);

    const fashion = await svc.list({ category: "Fashion" });
    expect(fashion.items.map((v) => v.id).sort()).toEqual(["v2", "v5"]);
  });

  it("searches identity fields case-insensitively", async () => {
    const byStore = await svc.list({ search: "OAU" });
    expect(byStore.items.map((v) => v.id)).toEqual(["v5"]);

    const byOwner = await svc.list({ search: "chioma" });
    expect(byOwner.items.map((v) => v.id)).toEqual(["v2"]);

    const none = await svc.list({ search: "zzz-no-match" });
    expect(none.total).toBe(0);
    expect(none.items).toEqual([]);
  });

  it("sorts by rating (desc) and totalSales (asc keeps nulls first)", async () => {
    const byRating = await svc.list({ sortBy: "rating", sortDir: "desc" });
    expect(byRating.items[0].id).toBe("v3"); // 4.9
    expect(byRating.items[1].id).toBe("v1"); // 4.8

    const bySales = await svc.list({ sortBy: "totalSales", sortDir: "asc" });
    const firstNonNull = bySales.items.findIndex((v) => v.totalSales !== null);
    expect(firstNonNull).toBeGreaterThan(0);
    expect(bySales.items.slice(0, firstNonNull).every((v) => v.totalSales === null)).toBe(true);
    expect(bySales.items.slice(firstNonNull).every((v) => v.totalSales !== null)).toBe(true);
  });

  it("paginates and clamps out-of-range pages", async () => {
    const first = await svc.list({ page: 1, pageSize: 3 });
    expect(first.items.length).toBe(3);
    expect(first.totalPages).toBe(Math.ceil(first.total / 3));

    const second = await svc.list({ page: 2, pageSize: 3 });
    const ids = new Set([...first.items, ...second.items].map((v) => v.id));
    expect(ids.size).toBe(6);

    const clamped = await svc.list({ page: 99, pageSize: 3 });
    expect(clamped.page).toBe(clamped.totalPages);
  });
});

describe("getCounts / getCategories", () => {
  it("matches the list total and the known bucket distribution", async () => {
    const counts = await svc.getCounts();
    const page = await svc.list();
    expect(counts.all).toBe(8);
    expect(counts.all).toBe(page.total);
    expect(counts.pending_verification).toBe(1);
    expect(counts.verified).toBe(6);
    expect(counts.suspended).toBe(0);
    expect(counts.rejected).toBe(0);
    expect(counts.deactivated).toBe(1);
    expect(counts.all).toBe(
      counts.pending_verification +
        counts.verified +
        counts.rejected +
        counts.suspended +
        counts.deactivated
    );
  });

  it("lists the union of categories sorted", async () => {
    expect(await svc.getCategories()).toEqual(["Electronics", "Fashion", "Food", "Textbooks"]);
  });
});

describe("getById", () => {
  it("returns the full detail payload for v1 from real stores", async () => {
    const detail = await svc.getById("v1");
    expect(detail).not.toBeNull();
    if (!detail) return;

    expect(detail.vendor.storeName).toBe("TechHub Owo");
    expect(detail.vendor.verificationStatus).toBe("verified");
    expect(detail.vendor.storeStatus).toBe("active");
    expect(detail.orders.length).toBe(8);
    expect(detail.vendor.ordersCount).toBe(8);
    expect(detail.products.length).toBe(9);
    expect(detail.vendor.productsCount).toBe(9);
    expect(detail.reviews.length).toBe(15);
    expect(detail.vendor.reviewsCount).toBe(15);
    expect(detail.vendor.fulfillmentRate).toBe(63); // 5/8 delivered
    expect(detail.vendor.totalSales).toBe(2_854_000);

    expect(detail.earnings.grossSales).toBe(2_854_000);
    expect(detail.earnings.commissionPaid).toBe(142_700);
    expect(detail.earnings.netEarnings).toBe(2_711_300);
    expect(detail.earnings.commissionRate).toBe(0.05);
    expect(detail.earnings.pendingPayout).toBe(43_175);
    expect(detail.earnings.lastPayoutAt).toBeNull();

    expect(detail.campus).not.toBeNull();
    expect(detail.vendor.owner.name).toBe("Ibrahim Musa");
    expect(detail.vendor.category).toBe("Electronics");
    expect(detail.complaints).toEqual([]);
  });

  it("surfaces only v8 payouts — other vendors never see them", async () => {
    for (const id of ["v1", "v2", "v3", "v4", "v5", "v6", "v7"]) {
      const detail = await svc.getById(id);
      const walletEvents = detail?.activity.filter((e) => e.kind === "wallet") ?? [];
      expect(walletEvents.length).toBe(0);
    }

    const v8 = await svc.getById("v8");
    if (!v8) return;
    const walletEvents = v8.activity.filter((e) => e.kind === "wallet");
    expect(walletEvents.length).toBe(2);
    expect(walletEvents.some((e) => e.message.includes("POUT-2001 successful"))).toBe(true);
    expect(walletEvents.some((e) => e.message.includes("POUT-2000 processing"))).toBe(true);
    expect(v8.earnings.pendingPayout).toBe(25_000);
    expect(v8.earnings.lastPayoutAt).toBe("2026-08-24T12:15:00.000Z");
  });

  it("reports nulls instead of invented numbers when no ledger exists", async () => {
    const v4 = await svc.getById("v4");
    expect(v4?.vendor.totalSales).toBeNull();
    expect(v4?.vendor.fulfillmentRate).toBeNull();
    expect(v4?.earnings.grossSales).toBeNull();
    expect(v4?.earnings.netEarnings).toBeNull();
    expect(v4?.vendor.ordersCount).toBe(0);

    const v6 = await svc.getById("v6");
    expect(v6?.vendor.totalSales).toBeNull();

    const v7 = await svc.getById("v7");
    expect(v7?.vendor.verificationStatus).toBe("verified");

    const v5 = await svc.getById("v5");
    expect(v5?.vendor.verificationStatus).toBe("pending_verification");
    expect(v5?.vendor.storeStatus).toBe("active");
    expect(v5?.vendor.fulfillmentRate).toBeNull();
    // owner u7 is not in the platform users store -> honest fallback
    expect(v5?.vendor.owner.name).toBe("Vendor owner");
  });

  it("returns null for unknown ids and [] for activity on unknown ids", async () => {
    expect(await svc.getById("v_missing")).toBeNull();
    expect(await svc.getActivity("v_missing")).toEqual([]);
  });

  it("returns activity sorted newest-first", async () => {
    const v1 = await svc.getById("v1");
    const events = v1?.activity ?? [];
    expect(events.length).toBeGreaterThan(0);
    for (let i = 1; i < events.length; i++) {
      expect(events[i - 1].at >= events[i].at).toBe(true);
    }
  });
});

describe("mutations (write-through transitions)", () => {
  it("approves the pending store and plays the admin event", async () => {
    const approved = await svc.approve("v5");
    expect(approved.verificationStatus).toBe("verified");

    const listed = await svc.list();
    expect(listed.items.find((v) => v.id === "v5")?.verificationStatus).toBe("verified");

    const activity = await svc.getActivity("v5");
    expect(activity.some((e) => e.kind === "admin" && e.message.includes("approved"))).toBe(true);
  });

  it("rejects a pending store with a reason and deactivates it", async () => {
    const rejected = await svc.reject("v5", "No BVN provided");
    expect(rejected.verificationStatus).toBe("rejected");
    expect(rejected.storeStatus).toBe("deactivated");

    const counts = await svc.getCounts();
    expect(counts.rejected).toBe(1);
    expect(counts.pending_verification).toBe(0);
  });

  it("rejects approve/reject on stores that are not pending", async () => {
    await expect(svc.approve("v1")).rejects.toThrow(/Only pending stores can be approved/);
    await expect(svc.reject("v1", "reason")).rejects.toThrow(/Only pending stores can be rejected/);
  });

  it("requires a rejection reason", async () => {
    await expect(svc.reject("v5", "   ")).rejects.toThrow(/reason is required/);
    const stillPending = await svc.getById("v5");
    expect(stillPending?.vendor.verificationStatus).toBe("pending_verification");
  });

  it("suspends, re-activates and deactivates a verified store", async () => {
    const suspended = await svc.suspend("v1");
    expect(suspended.storeStatus).toBe("suspended");

    const listed = await svc.list({ queue: "suspended" });
    expect(listed.items.map((v) => v.id)).toEqual(["v1"]);
    expect((await svc.getActivity("v1")).some((e) => e.kind === "admin" && e.message.includes("Store suspended"))).toBe(true);

    const activated = await svc.activate("v1");
    expect(activated.storeStatus).toBe("active");

    const deactivated = await svc.deactivate("v1");
    expect(deactivated.storeStatus).toBe("deactivated");
    expect((await svc.list({ queue: "deactivated" })).items.map((v) => v.id)).toContain("v1");
  });

  it("guards illegal store transitions", async () => {
    await expect(svc.suspend("v5")).rejects.toThrow(/Only verified stores can be suspended/);
    await expect(svc.activate("v5")).rejects.toThrow(/Verify the vendor before activating/);
    await expect(svc.deactivate("v5")).rejects.toThrow(/Unverified vendors/);
    await expect(svc.suspend("v1").then(() => svc.suspend("v1"))).rejects.toThrow(/already/);
    await expect(svc.deactivate("v7")).rejects.toThrow(/already deactivated/);
    await expect(svc.activate("v8")).rejects.toThrow(/already active/);
  });

  it("enables a deactivated store to come back online", async () => {
    const active = await svc.activate("v7");
    expect(active.storeStatus).toBe("active");
    expect((await svc.getCounts()).deactivated).toBe(0);
  });
});