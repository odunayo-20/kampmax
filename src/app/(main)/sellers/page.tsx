"use client";

import { useState } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { Search, Store } from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { VendorCard } from "@/components/home";
import { useApp } from "@/lib/app-context";
import { useDebounce } from "@/hooks/use-debounce";
import { toApiCampusId } from "@/hooks/use-home";
import { fetchVendors } from "@/services/users";

/** Every seller on the selected campus, searchable. Opened from "View all" on Home. */
export default function SellersPage() {
  const { selectedCampus } = useApp();
  const campusId = toApiCampusId(selectedCampus.id);
  const [search, setSearch] = useState("");
  const q = useDebounce(search.trim(), 300);

  const sellers = useInfiniteQuery({
    queryKey: ["sellers", campusId ?? "all", q],
    queryFn: async ({ pageParam }) => {
      const res = await fetchVendors({ campusId, search: q || undefined, page: pageParam, limit: 20 });
      // fetchVendors falls back to seeded data on failure; this page only shows live shops.
      if (res.error) throw new Error("Request failed");
      return res;
    },
    initialPageParam: 1,
    getNextPageParam: (last) => (last.page < last.totalPages ? last.page + 1 : undefined),
  });
  const list = sellers.data?.pages.flatMap((p) => p.data) ?? [];

  return (
    <PageContainer className="space-y-4 pb-14">
      <div>
        <h1 className="text-xl font-bold text-neutral-900">Campus sellers</h1>
        <p className="text-xs text-neutral-500">Shops at {selectedCampus.name || "your campus"}</p>
      </div>

      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" aria-hidden />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search shops..."
          aria-label="Search shops"
          className="h-11 w-full rounded-xl border border-neutral-200 bg-white pl-10 pr-4 text-sm text-neutral-900 shadow-xs placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-600"
        />
      </div>

      {sellers.isPending ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-busy="true">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-2xl bg-neutral-200/70" />
          ))}
        </div>
      ) : sellers.isError ? (
        <div role="alert" className="rounded-2xl border border-error-100 bg-error-50 p-6 text-center">
          <p className="text-sm font-semibold text-error-700">Couldn&apos;t load sellers</p>
          <p className="mt-1 text-xs text-error-700/80">Check your internet connection and try again.</p>
          <button
            onClick={() => sellers.refetch()}
            className="mt-3 rounded-lg bg-white px-4 py-2 text-xs font-semibold text-error-700 shadow-sm hover:bg-error-50 transition-colors"
          >
            Try again
          </button>
        </div>
      ) : list.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-neutral-300 bg-white p-10 text-center">
          <Store className="mx-auto h-10 w-10 text-neutral-300" aria-hidden />
          <p className="mt-3 text-sm font-semibold text-neutral-800">No sellers found</p>
          <p className="mt-1 text-xs text-neutral-500">{q ? "Nothing matches that search." : "No shops here yet."}</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {list.map((vendor) => (
              <VendorCard key={vendor.id} vendor={vendor} className="w-full" />
            ))}
          </div>
          {sellers.hasNextPage && (
            <div className="text-center">
              <button
                onClick={() => sellers.fetchNextPage()}
                disabled={sellers.isFetchingNextPage}
                className="rounded-full border border-neutral-200 bg-white px-5 py-2 text-xs font-semibold text-neutral-700 hover:border-primary-300 disabled:opacity-60"
              >
                {sellers.isFetchingNextPage ? "Loading..." : "Show more"}
              </button>
            </div>
          )}
        </>
      )}
    </PageContainer>
  );
}
