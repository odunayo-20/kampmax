import type { Product } from "@/types";

const PER_LIST = 4;
/** Only the latest few searches say anything about what someone wants right now. */
const SEARCHES_USED = 5;
/** Words this short ("a", "of", "pc") match too much to mean anything. */
const MIN_WORD = 3;

export type ProductTabId = "picks" | "new" | "deals";

/** What we know about this person from this browser and their account. All optional. */
export interface PersonalSignals {
  /** Recent searches, newest first. */
  searches: string[];
  /** Stores they have saved something from. */
  savedVendorIds: string[];
  /** Products already saved: not suggested again. */
  savedProductIds: string[];
}

export interface ProductLists {
  /** The newest listings. */
  new: Product[];
  /**
   * Everything else, kept apart from "new" so the tabs never repeat each other. In a
   * personal order when we know something about the person, otherwise the feed's own.
   */
  picks: Product[];
  /** Listings marked down from an earlier price. */
  deals: Product[];
  /** True when the order of `picks` was actually changed by what we know about the person. */
  personalised: boolean;
}

/** How well a product fits what the person has searched for and the stores they like. */
function fit(product: Product, searches: string[], savedVendors: Set<string>): number {
  const haystack = [product.title, ...(product.tags ?? [])].join(" ").toLowerCase();
  let score = savedVendors.has(product.vendorId) ? 2 : 0;

  for (const search of searches) {
    const words = search.toLowerCase().split(/\s+/).filter((w) => w.length >= MIN_WORD);
    if (words.length === 0) continue;
    const found = words.filter((w) => haystack.includes(w)).length;
    if (found === words.length) score += 3; // every word of the search is there
    else if (found > 0) score += 1; // part of it is
  }
  return score;
}

/**
 * Splits the home feed into the three lists the product section switches between.
 * "New" and "Picks" never share a product (they used to be near-identical lists);
 * "Deals" is a filter, so a discounted product may also appear in another tab.
 *
 * With `signals`, "Picks" is ordered by fit with the person's recent searches and saved
 * stores, and leaves out what they have already saved. Without any, nothing changes.
 */
export function splitProducts(products: Product[], signals?: PersonalSignals): ProductLists {
  const newest = [...products]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, PER_LIST);
  const newestIds = new Set(newest.map((p) => p.id));

  const searches = (signals?.searches ?? []).slice(0, SEARCHES_USED);
  const savedVendors = new Set(signals?.savedVendorIds ?? []);
  const savedProducts = new Set(signals?.savedProductIds ?? []);

  const candidates = products
    .filter((p) => !newestIds.has(p.id) && !savedProducts.has(p.id))
    .map((product) => ({ product, score: fit(product, searches, savedVendors) }));

  // A stable sort: products that fit equally well stay in the feed's order.
  const ranked = [...candidates].sort((a, b) => b.score - a.score).slice(0, PER_LIST);

  return {
    new: newest,
    picks: ranked.map((r) => r.product),
    deals: products.filter((p) => p.originalPrice && p.originalPrice > p.price).slice(0, PER_LIST),
    personalised: ranked.some((r) => r.score > 0),
  };
}
