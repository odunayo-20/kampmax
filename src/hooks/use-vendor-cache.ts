"use client";

import { useQueries } from "@tanstack/react-query";
import { fetchVendorById, getVendorById } from "@/services/users";

/**
 * Makes sure the given vendors are loaded into the shared vendor cache that
 * sync helpers (`getVendorById`) read from — e.g. when the cart or checkout is
 * opened directly and no marketplace page has populated it yet.
 *
 * Returns the number of vendors now resolved; include it in dependency arrays
 * of anything derived from `getVendorById` so it recomputes once names arrive.
 */
export function useEnsureVendors(vendorIds: string[]): number {
  const missing = Array.from(new Set(vendorIds.filter(Boolean)));
  const results = useQueries({
    queries: missing.map((id) => ({
      queryKey: ["vendors", "public", id],
      staleTime: 5 * 60_000,
      retry: 1,
      queryFn: async () => {
        if (getVendorById(id)) return id;
        const { data, error } = await fetchVendorById(id);
        if (!data) throw error ?? new Error("Vendor not found");
        return id;
      },
    })),
  });
  return results.filter((r) => r.isSuccess).length;
}
