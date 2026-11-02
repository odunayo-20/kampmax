import type { Product } from "@/types";

const PER_LIST = 4;

export type ProductTabId = "picks" | "new" | "deals";

export interface ProductLists {
  /** The newest listings. */
  new: Product[];
  /** Everything else the feed returned, kept apart from "new" so the tabs never repeat each other. */
  picks: Product[];
  /** Listings marked down from an earlier price. */
  deals: Product[];
}

/**
 * Splits the home feed into the three lists the product section switches between.
 * "New" and "Picks" never share a product (they used to be near-identical lists);
 * "Deals" is a filter, so a discounted product may also appear in another tab.
 */
export function splitProducts(products: Product[]): ProductLists {
  const newest = [...products]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, PER_LIST);
  const newestIds = new Set(newest.map((p) => p.id));

  return {
    new: newest,
    picks: products.filter((p) => !newestIds.has(p.id)).slice(0, PER_LIST),
    deals: products.filter((p) => p.originalPrice && p.originalPrice > p.price).slice(0, PER_LIST),
  };
}
