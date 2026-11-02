"use client";

import { useMemo } from "react";
import { useWishlist } from "@/services/wishlist";
import { useRecentSearches } from "@/hooks/use-recent-searches";
import type { PersonalSignals } from "@/components/home/product-lists";

/**
 * What we know about this person that can tailor the home page: what they searched for
 * lately (kept in this browser) and what they have saved (their account's wishlist).
 * Empty for a new visitor or a guest, and on the server, where nothing is personal.
 */
export function usePersonalSignals(): PersonalSignals {
  const { searches } = useRecentSearches();
  const { items } = useWishlist();

  return useMemo(() => {
    const savedProducts = items.filter((i) => i.targetType === "PRODUCT");
    return {
      searches,
      savedProductIds: savedProducts.map((i) => i.targetId),
      savedVendorIds: [...new Set(savedProducts.flatMap((i) => (i.product ? [i.product.vendorId] : [])))],
    };
  }, [searches, items]);
}
