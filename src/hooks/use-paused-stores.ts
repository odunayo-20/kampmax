"use client";

import { useQueries } from "@tanstack/react-query";
import { fetchAcceptingOrders } from "@/services/storefront";

/**
 * Which of these stores have paused new orders. A store that cannot be checked
 * counts as open, so a failed lookup never blocks a buyer: the server still decides.
 */
export function usePausedStores(vendorIds: string[]): Set<string> {
  const ids = [...new Set(vendorIds.filter(Boolean))];
  const checks = useQueries({
    queries: ids.map((id) => ({
      queryKey: ["storefront", "accepting-orders", id],
      queryFn: () => fetchAcceptingOrders(id),
      staleTime: 60_000,
    })),
  });
  return new Set(ids.filter((_, i) => checks[i]?.data === false));
}
