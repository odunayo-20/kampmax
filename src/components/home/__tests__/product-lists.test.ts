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
    expect(splitProducts([])).toEqual({ new: [], picks: [], deals: [] });
  });
});
