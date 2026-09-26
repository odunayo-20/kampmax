import type { Product } from "@/types";

/**
 * True when a product can't be bought because there is none left: the backend
 * flagged it OUT_OF_STOCK (mapped to status "sold"), or its stock count is 0.
 * A stock of -1 means unlimited.
 */
export function isOutOfStock(product: Pick<Product, "status" | "stock">): boolean {
  if (product.status === "sold") return true;
  return typeof product.stock === "number" && product.stock === 0;
}
