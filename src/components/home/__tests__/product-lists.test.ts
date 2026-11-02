import { describe, expect, it } from "vitest";
import type { Product } from "@/types";
import { splitProducts } from "../product-lists";

const product = (id: number, createdAt: string, price = 100, originalPrice?: number) =>
  ({ id: `p${id}`, createdAt, price, originalPrice }) as Product;

/** p1 is the oldest, p8 the newest. */
const eight = Array.from({ length: 8 }, (_, i) => product(i + 1, `2026-01-0${i + 1}`));

const ids = (list: Product[]) => list.map((p) => p.id);

describe("splitProducts", () => {
  it("puts the four newest in New, newest first", () => {
    expect(ids(splitProducts(eight).new)).toEqual(["p8", "p7", "p6", "p5"]);
  });

  it("keeps Picks apart from New, so the two tabs never show the same product", () => {
    const { new: fresh, picks } = splitProducts(eight);

    expect(ids(picks)).toEqual(["p1", "p2", "p3", "p4"]);
    expect(ids(picks).filter((id) => ids(fresh).includes(id))).toEqual([]);
  });

  it("has no Picks when everything already counts as new", () => {
    expect(splitProducts(eight.slice(0, 4)).picks).toEqual([]);
  });

  it("collects marked-down products in Deals, wherever they sit", () => {
    const withDeals = [
      product(1, "2026-01-01", 80, 100),
      product(2, "2026-01-02", 100, 100), // same price: not a deal
      product(3, "2026-01-03", 120, 100), // dearer than before: not a deal
      product(4, "2026-01-04", 50, 90),
    ];

    expect(ids(splitProducts(withDeals).deals)).toEqual(["p1", "p4"]);
  });

  it("copes with an empty feed", () => {
    expect(splitProducts([])).toEqual({ new: [], picks: [], deals: [], personalised: false });
  });

  it("leaves Picks in the feed's order, and says so, when we know nothing about the person", () => {
    const lists = splitProducts(eight, { searches: [], savedVendorIds: [], savedProductIds: [] });

    expect(ids(lists.picks)).toEqual(["p1", "p2", "p3", "p4"]);
    expect(lists.personalised).toBe(false);
  });
});

describe("splitProducts, tailored to the person", () => {
  const item = (id: number, title: string, vendorId = "v0") =>
    ({ ...product(id, `2026-01-${String(id).padStart(2, "0")}`), title, vendorId }) as Product;
  const none = { searches: [], savedVendorIds: [], savedProductIds: [] };

  /** Eight products so the four oldest are candidates for Picks. */
  const shelf = [
    item(1, "Plain notebook"),
    item(2, "Scientific calculator"),
    item(3, "Desk lamp"),
    item(4, "Logo design pack"),
    item(5, "Backpack"),
    item(6, "Phone case"),
    item(7, "Water bottle"),
    item(8, "Headphones"),
  ];

  it("lifts what matches a recent search to the front of Picks", () => {
    const lists = splitProducts(shelf, { ...none, searches: ["logo design"] });

    // p4 matches both words, so it jumps ahead of p1..p3, which keep their order.
    expect(ids(lists.picks)).toEqual(["p4", "p1", "p2", "p3"]);
    expect(lists.personalised).toBe(true);
  });

  it("counts a partial match, but less than a full one", () => {
    const lists = splitProducts(shelf, { ...none, searches: ["lamp shade"] });

    expect(lists.picks[0].id).toBe("p3");
  });

  it("ignores words too short to mean anything", () => {
    const lists = splitProducts(shelf, { ...none, searches: ["a pc"] });

    expect(lists.personalised).toBe(false);
  });

  it("favours stores the person has saved from", () => {
    const stores = [item(1, "A", "other"), item(2, "B", "mine"), item(3, "C", "other"), item(4, "D", "other"), ...shelf.slice(4)];
    const lists = splitProducts(stores, { ...none, savedVendorIds: ["mine"] });

    expect(lists.picks[0].id).toBe("p2");
    expect(lists.personalised).toBe(true);
  });

  it("does not suggest what is already saved", () => {
    const lists = splitProducts(shelf, { ...none, savedProductIds: ["p1", "p2"] });

    expect(ids(lists.picks)).toEqual(["p3", "p4"]);
  });

  it("only looks at the latest few searches", () => {
    const old = ["logo design"];
    const searches = ["one", "two", "three", "four", "five", ...old];

    expect(splitProducts(shelf, { ...none, searches }).personalised).toBe(false);
  });
});
