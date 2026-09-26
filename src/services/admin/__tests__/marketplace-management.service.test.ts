import { describe, expect, it } from "vitest";
import { createMarketplaceManagementService } from "@/services/admin/marketplace-management.mock";

// ------------------------------------------------------------
// MARKETPLACE MANAGEMENT SERVICE TESTS (Module 39)
//
// The service re-derives every row from the REAL product/vendor/
// storefront/category/campus stores (no PRNGs, no fabricated data).
// Known seed facts:
//   - 38 products: v1:9, v2:5, v3:3, v4:2, v5:1, v6:2, v7:2, v8:14
//   - status: available 35 / sold 1 (p24) / removed 2 (p37,p38)
//   - publishedStatus ONLY on v8: active p25-p36 (12), draft p37,
//     archived p38; all other products have none (unset = 24)
//   - storefronts exist for v1-v7; v8 has none (verified vendor)
//   - v7 storefront is temporarily_unavailable → p18,p19 are
//     paused_storefront; live = 33
//   - stock only on v8 catalog: p25-p36 + p37/p38 (in stock 11,
//     out of stock p30/p37/p38 = 3, not tracked 24)
// ------------------------------------------------------------

const svc = createMarketplaceManagementService();

describe("list", () => {
  it("returns every real listing with honest console fields", async () => {
    const page = await svc.list({ pageSize: 50 });
    expect(page.total).toBe(38);
    expect(page.page).toBe(1);
    expect(page.items.length).toBe(38);

    const p1 = page.items.find((r) => r.id === "p1");
    expect(p1?.title).toBe("Engineering Mathematics Textbook");
    expect(p1?.categoryName).toBe("Textbooks");
    expect(p1?.campusName).toBe("Rufus Giwa Polytechnic");
    expect(p1?.campusAbbr).toBe("RUGIPO");
    expect(p1?.vendorName).toBe("TechHub Owo");
    expect(p1?.vendorVerified).toBe(true);
    expect(p1?.vendorVerification).toBe("verified");
    expect(p1?.storefrontAvailability).toBe("active");
    expect(p1?.visibility).toBe("live");

    for (const item of page.items) {
      expect(item.images.length).toBeGreaterThan(0);
      expect(item.images.every((img) => img.startsWith("/placeholder-product.svg"))).toBe(true);
      expect(item.condition).toMatch(/^(New|Used|Fair)$/);
      expect(item.status).toMatch(/^(available|sold|removed)$/);
      expect(item.visibility).toMatch(/^(live|paused_storefront|storefront_missing|unpublished|sold|removed)$/);
      expect(item).not.toHaveProperty("costPrice");
    }
  });

  it("filters by trading status", async () => {
    const sold = await svc.list({ status: "sold" });
    expect(sold.items.map((r) => r.id)).toEqual(["p24"]);

    const removed = await svc.list({ status: "removed" });
    expect(removed.items.map((r) => r.id)).toEqual(["p37", "p38"]);
  });

  it("filters by visibility", async () => {
    const paused = await svc.list({ visibility: "paused_storefront" });
    expect(paused.items.map((r) => r.id)).toEqual(["p19", "p18"]);
    expect(paused.items.every((r) => r.vendorId === "v7")).toBe(true);

    const live = await svc.list({ visibility: "live" });
    expect(live.total).toBe(33);
  });

  it("filters by publication state", async () => {
    const active = await svc.list({ publication: "active" });
    expect(active.total).toBe(12);
    expect(active.items.every((r) => r.publishedStatus === "active")).toBe(true);
    expect(active.items.every((r) => r.vendorId === "v8")).toBe(true);

    const draft = await svc.list({ publication: "draft" });
    expect(draft.items.map((r) => r.id)).toEqual(["p37"]);

    const archived = await svc.list({ publication: "archived" });
    expect(archived.items.map((r) => r.id)).toEqual(["p38"]);

    const unset = await svc.list({ publication: "unset" });
    expect(unset.total).toBe(24);
    expect(unset.items.every((r) => r.publishedStatus === null)).toBe(true);
  });

  it("filters by category, campus and vendor from real facets", async () => {
    const electronics = await svc.list({ categoryId: "cat2" });
    expect(electronics.total).toBe(22);

    const unilag = await svc.list({ campusId: "unilag" });
    expect(unilag.items.map((r) => r.id)).toEqual(["p19", "p18"]);

    const v8 = await svc.list({ vendorId: "v8" });
    expect(v8.total).toBe(14);
    expect(v8.items.every((r) => r.vendorId === "v8")).toBe(true);

    const combo = await svc.list({ vendorId: "v8", publication: "active" });
    expect(combo.total).toBe(12);
  });

  it("filters by stock tracking", async () => {
    const inStock = await svc.list({ stock: "in_stock" });
    expect(inStock.total).toBe(11);
    expect(inStock.items.every((r) => r.stock !== null && r.stock > 0)).toBe(true);

    const out = await svc.list({ stock: "out_of_stock" });
    expect(out.items.map((r) => r.id)).toEqual(["p37", "p30", "p38"]);

    const untracked = await svc.list({ stock: "not_tracked" });
    expect(untracked.total).toBe(24);
    expect(untracked.items.every((r) => r.stock === null)).toBe(true);
  });

  it("searches title, description, vendor, SKU and id case-insensitively", async () => {
    // p34's description also mentions "MacBook Pro" (1.3x charging).
    const macBook = await svc.list({ search: "MacBook" });
    expect(macBook.items.map((r) => r.id).sort()).toEqual(["p14", "p27", "p34"]);

    const powerBank = await svc.list({ search: "power bank" });
    expect(powerBank.items.map((r) => r.id).sort()).toEqual(["p10", "p34"]);

    const vendor = await svc.list({ search: "adebayo" });
    expect(vendor.total).toBe(14);

    const sku = await svc.list({ search: "ADG-IP13PM" });
    expect(sku.items.map((r) => r.id)).toEqual(["p25"]);

    const none = await svc.list({ search: "zzz-no-match" });
    expect(none.total).toBe(0);
  });

  it("sorts by price, rating, views, name and created", async () => {
    const priceAsc = await svc.list({ sortBy: "price", sortDir: "asc" });
    expect(priceAsc.items[0].price).toBeLessThanOrEqual(priceAsc.items[1].price);

    const ratingDesc = await svc.list({ sortBy: "rating", sortDir: "desc" });
    expect(ratingDesc.items[0].rating).toBe(4.9);

    const viewsDesc = await svc.list({ sortBy: "viewCount", sortDir: "desc" });
    expect(viewsDesc.items[0].id).toBe("p25"); // 890 views

    const nameAsc = await svc.list({ sortBy: "name", sortDir: "asc" });
    expect(nameAsc.items[0].id).toBe("p34"); // "Anker 737 Power Bank 24000mAh"

    const newest = await svc.list({ sortBy: "createdAt", sortDir: "desc" });
    expect(newest.items[0].id).toBe("p37"); // 2025-03-01
  });

  it("paginates with safe bounds", async () => {
    const page4 = await svc.list({ page: 4, pageSize: 10 });
    expect(page4.page).toBe(4);
    expect(page4.totalPages).toBe(4);
    expect(page4.items.length).toBe(8);

    const over = await svc.list({ page: 99, pageSize: 10 });
    expect(over.page).toBe(4);

    const tiny = await svc.list({ page: 1, pageSize: 50 });
    expect(tiny.items.length).toBe(38);
  });
});

describe("counts", () => {
  it("reflects the real seed distribution for the marketplace", async () => {
    const counts = await svc.getCounts();
    expect(counts).toEqual({
      all: 38,
      available: 35,
      sold: 1,
      removed: 2,
      live: 33,
      paused_storefront: 2,
      storefront_missing: 0,
      unpublished: 0,
    });
  });
});

describe("facets", () => {
  it("computes categories, campuses and vendors from real rows", async () => {
    const facets = await svc.getFacets();

    expect(facets.categories).toEqual(
      expect.arrayContaining([
        { id: "cat1", name: "Textbooks", count: 7 },
        { id: "cat2", name: "Electronics", count: 22 },
        { id: "cat3", name: "Fashion", count: 3 },
        { id: "cat4", name: "Gaming", count: 1 },
        { id: "cat5", name: "Hostel & Home", count: 3 },
        { id: "cat6", name: "Food & Snacks", count: 1 },
        { id: "cat7", name: "Beauty", count: 1 },
      ])
    );

    expect(facets.campuses).toEqual(
      expect.arrayContaining([
        { id: "rugipo", name: "Rufus Giwa Polytechnic", count: 31 },
        { id: "oau", name: "Obafemi Awolowo University", count: 3 },
        { id: "ui", name: "University of Ibadan", count: 2 },
        { id: "unilag", name: "University of Lagos", count: 2 },
      ])
    );

    const vendorCounts = Object.fromEntries(facets.vendors.map((v) => [v.id, v.count]));
    expect(vendorCounts).toEqual({
      v1: 9,
      v2: 5,
      v3: 3,
      v4: 2,
      v5: 1,
      v6: 2,
      v7: 2,
      v8: 14,
    });
  });
});

describe("getById / activity", () => {
  it("returns a full detail for a sold listing", async () => {
    const detail = await svc.getById("p24");
    expect(detail).not.toBeNull();
    expect(detail?.listing.status).toBe("sold");
    expect(detail?.listing.visibility).toBe("sold");
    expect(detail?.vendor?.storeName).toBe("TechHub Owo");
    expect(detail?.vendor?.productsCount).toBe(9);
    expect(detail?.activity.some((e) => e.message.includes("created"))).toBe(true);
  });

  it("links v8 listings to its verified seller without a storefront", async () => {
    const detail = await svc.getById("p25");
    expect(detail?.vendor?.storeName).toBe("Adebayo's Gadgets");
    expect(detail?.vendor?.verified).toBe(true);
    expect(detail?.vendor?.storefrontAvailability).toBeNull();
    expect(detail?.vendor?.productsCount).toBe(14);
    expect(detail?.listing.publishedStatus).toBe("active");
    expect(detail?.activity.some((e) => e.message === "Publication set to active")).toBe(true);
  });

  it("derives paused storefront visibility for v7 listings", async () => {
    const detail = await svc.getById("p18");
    expect(detail?.listing.visibility).toBe("paused_storefront");
    expect(detail?.vendor?.storefrontAvailability).toBe("temporarily_unavailable");
  });

  it("treats removed listings as removed even with a publication record", async () => {
    const draft = await svc.getById("p37");
    expect(draft?.listing.status).toBe("removed");
    expect(draft?.listing.visibility).toBe("removed");
    expect(draft?.listing.publishedStatus).toBe("draft");

    const archived = await svc.getById("p38");
    expect(archived?.listing.visibility).toBe("removed");
    expect(archived?.listing.publishedStatus).toBe("archived");
    expect(archived?.listing.archivedAt).toBe("2025-01-20");
    expect(archived?.activity.some((e) => e.message === "Listing archived")).toBe(true);
  });

  it("returns null for unknown listings and empty activity", async () => {
    expect(await svc.getById("p999")).toBeNull();
    expect(await svc.getActivity("p999")).toEqual([]);
  });

  it("never exposes vendor cost price in the detail payload", async () => {
    const detail = await svc.getById("p25");
    expect(detail?.listing).not.toHaveProperty("costPrice");
    expect(detail?.vendor).not.toHaveProperty("costPrice");
  });
});