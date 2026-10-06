import { Product } from "@/types";

const RECENTLY_VIEWED_KEY = "kampmax_recently_viewed_products";
const MAX_RECENT_ITEMS = 12;

/**
 * Get all recently viewed products from localStorage.
 */
export function getRecentlyViewed(): Product[] {
  if (typeof window === "undefined") return [];
  try {
    const data = localStorage.getItem(RECENTLY_VIEWED_KEY);
    return data ? JSON.parse(data) : [];
  } catch (err) {
    console.error("Failed to read recently viewed products:", err);
    return [];
  }
}

/**
 * Add a product to recently viewed list (prevents duplicates, keeps newest first).
 */
export function addRecentlyViewed(product: Product): Product[] {
  if (typeof window === "undefined" || !product || !product.id) return [];
  try {
    const current = getRecentlyViewed();
    const filtered = current.filter((p) => p.id !== product.id);
    const updated = [product, ...filtered].slice(0, MAX_RECENT_ITEMS);
    localStorage.setItem(RECENTLY_VIEWED_KEY, JSON.stringify(updated));
    return updated;
  } catch (err) {
    console.error("Failed to update recently viewed products:", err);
    return [];
  }
}

/**
 * Replace the stored list (used after re-checking items against the live catalogue).
 */
export function saveRecentlyViewed(products: Product[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(RECENTLY_VIEWED_KEY, JSON.stringify(products.slice(0, MAX_RECENT_ITEMS)));
  } catch (err) {
    console.error("Failed to save recently viewed products:", err);
  }
}

/**
 * Clear all recently viewed products.
 */
export function clearRecentlyViewed(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(RECENTLY_VIEWED_KEY);
  } catch (err) {
    console.error("Failed to clear recently viewed products:", err);
  }
}
