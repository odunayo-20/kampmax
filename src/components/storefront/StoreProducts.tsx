"use client";

import { useEffect, useState } from "react";
import { keepPreviousData, useInfiniteQuery } from "@tanstack/react-query";
import { Search, PackageOpen } from "lucide-react";
import type { StoreSortOption, Storefront } from "@/types/storefront";
import { isUnavailable } from "@/services/storefront";
import { fetchProducts, type ProductQueryParams } from "@/services/products";
import { ProductCard, ProductGrid } from "@/components/marketplace";
import { Button } from "@/components/atoms/Button";
import { StoreCategories } from "./StoreCategories";
import { StoreSortDropdown } from "./StoreSortDropdown";
import { StoreEmptyState } from "./StoreEmptyState";
import { StoreProductsSkeleton } from "./StoreSkeleton";

interface StoreProductsProps {
  store: Storefront;
}

const PAGE_SIZE = 12;
const SEARCH_DEBOUNCE_MS = 300;

/** The backend orders by newest or by price. */
const SERVER_SORT: Record<StoreSortOption, NonNullable<ProductQueryParams["sort"]>> = {
  featured: "recent",
  newest: "recent",
  rating: "recent",
  price_asc: "price_low",
  price_desc: "price_high",
};

function useDebounced<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}

/** Store product catalog: search, categories, sort and paging all done by the server. */
export function StoreProducts({ store }: StoreProductsProps) {
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [sort, setSort] = useState<StoreSortOption>("newest");
  const shopUnavailable = isUnavailable(store);
  const debouncedSearch = useDebounced(search.trim(), SEARCH_DEBOUNCE_MS);

  const query: ProductQueryParams = {
    vendorId: store.vendorId,
    status: "ACTIVE",
    search: debouncedSearch || undefined,
    categoryId: categoryId || undefined,
    sort: SERVER_SORT[sort],
    limit: PAGE_SIZE,
  };

  const productsQuery = useInfiniteQuery({
    queryKey: ["storefront", "products", store.vendorId, query],
    initialPageParam: 1,
    placeholderData: keepPreviousData,
    queryFn: async ({ pageParam }) => {
      const res = await fetchProducts({ ...query, page: pageParam });
      if (res.error) throw res.error;
      return res;
    },
    getNextPageParam: (last) => (last.page < last.totalPages ? last.page + 1 : undefined),
  });

  const products = (productsQuery.data?.pages ?? [])
    .flatMap((page) => page.data)
    .filter((p) => p.status === "available");
  const total = productsQuery.data?.pages[0]?.total ?? 0;
  const hasFilters = search !== "" || categoryId !== "" || sort !== "newest";

  if (productsQuery.isPending) {
    return <StoreProductsSkeleton count={8} />;
  }

  if (productsQuery.isError) {
    return (
      <div role="alert" className="rounded-2xl border border-kampmax-border bg-white px-4 py-12 text-center">
        <p className="text-sm font-semibold text-kampmax-text">We couldn&apos;t load this store&apos;s products</p>
        <p className="mt-1 text-xs text-kampmax-text-secondary">Check your connection and try again.</p>
        <Button variant="outline" size="sm" className="mt-4" onClick={() => void productsQuery.refetch()}>
          Try again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {shopUnavailable && (
        <div className="bg-accent-50 border border-accent-100 text-accent-700 text-sm rounded-lg px-4 py-3">
          This store is currently unavailable. You can browse existing products,
          but ordering is temporarily disabled.
        </div>
      )}

      {/* Toolbar */}
      <div className="space-y-3 rounded-2xl border border-kampmax-border bg-white p-3 sm:p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <label htmlFor="store-search" className="sr-only">
              Search this store
            </label>
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-kampmax-text-secondary" aria-hidden />
            <input
              id="store-search"
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={`Search ${store.storeName}…`}
              className="w-full rounded-lg border border-kampmax-border bg-kampmax-bg py-2.5 pl-10 pr-3 text-sm transition-colors focus:border-kampmax-blue focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-100"
            />
          </div>
          <div className="flex items-center justify-between gap-3 sm:justify-end">
            <span className="whitespace-nowrap text-xs text-kampmax-text-secondary" aria-live="polite">
              {total.toLocaleString()} product{total !== 1 ? "s" : ""}
            </span>
            <StoreSortDropdown value={sort} onChange={setSort} />
          </div>
        </div>

        {store.categories.length > 0 && (
          <div className="border-t border-kampmax-border pt-3">
            <StoreCategories
              categories={store.categories}
              activeCategoryId={categoryId}
              onCategoryChange={(id) => setCategoryId(id)}
            />
          </div>
        )}
      </div>

      {/* Grid / empty */}
      {products.length === 0 ? (
        <StoreEmptyState
          icon={<PackageOpen />}
          title={
            total === 0 && !hasFilters
              ? "This store hasn't listed any products yet"
              : "No products match your filters"
          }
          description={
            total === 0 && !hasFilters
              ? `Check back soon — ${store.storeName} will list products here.`
              : "Try a different search or category."
          }
          action={
            hasFilters ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearch("");
                  setCategoryId("");
                  setSort("newest");
                }}
              >
                Clear filters
              </Button>
            ) : undefined
          }
        />
      ) : (
        <>
          <ProductGrid>
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </ProductGrid>

          {productsQuery.hasNextPage && (
            <div className="flex justify-center pt-4">
              <Button
                variant="outline"
                disabled={productsQuery.isFetchingNextPage}
                onClick={() => void productsQuery.fetchNextPage()}
                className="border-kampmax-border"
              >
                {productsQuery.isFetchingNextPage
                  ? "Loading…"
                  : `Load more (${Math.max(total - products.length, 0)} remaining)`}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

/** Client-skeleton wrapper used by the page while data loads. */
export function StoreProductsLoading() {
  return <StoreProductsSkeleton count={8} />;
}
