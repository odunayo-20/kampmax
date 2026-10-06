"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, PackageOpen } from "lucide-react";
import type { StoreSortOption, Storefront } from "@/types/storefront";
import {
  getStoreCategories,
  getStoreProducts,
  isUnavailable,
} from "@/services/storefront";
import { fetchProducts } from "@/services/products";
import type { Product } from "@/types";
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

/** Client-side sort + paginate over an already vendor/status/search-filtered live product list. */
function paginateAndSort(
  products: Product[],
  sort: StoreSortOption,
  page: number,
  pageSize: number
): { items: Product[]; total: number; page: number; pageSize: number; totalPages: number; unavailableCount: number } {
  const sorted = [...products];
  switch (sort) {
    case "price_asc":
      sorted.sort((a, b) => a.price - b.price);
      break;
    case "price_desc":
      sorted.sort((a, b) => b.price - a.price);
      break;
    case "rating":
      sorted.sort((a, b) => (b.rating || 0) - (a.rating || 0));
      break;
    case "newest":
      sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      break;
    case "featured":
    default:
      sorted.sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0));
      break;
  }

  const total = sorted.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const start = (page - 1) * pageSize;
  const items = sorted.slice(start, start + pageSize);

  return { items, total, page, pageSize, totalPages, unavailableCount: 0 };
}

/** Store product catalog: search, categories, sort, availability, pagination. */
export function StoreProducts({ store }: StoreProductsProps) {
  const categories = useMemo(() => getStoreCategories(store), [store]);

  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [sort, setSort] = useState<StoreSortOption>("featured");
  const [page, setPage] = useState(1);
  const [shopUnavailable] = useState(isUnavailable(store));
  const [liveProducts, setLiveProducts] = useState<Product[] | null>(null);
  const [isFetching, setIsFetching] = useState(true);

  // Reset pagination whenever the filters change.
  useEffect(() => {
    setPage(1);
  }, [search, categoryId, sort]);

  // Fetch this vendor's live catalog from the backend (debounced on search).
  useEffect(() => {
    let mounted = true;
    setIsFetching(true);
    const timeout = setTimeout(
      () => {
        fetchProducts({
          vendorId: store.vendorId,
          status: "ACTIVE",
          search: search || undefined,
          categoryId: categoryId || undefined,
          limit: 100,
        })
          .then((res) => {
            if (mounted) setLiveProducts(res.data);
          })
          .finally(() => {
            if (mounted) setIsFetching(false);
          });
      },
      search ? 300 : 0
    );
    return () => {
      mounted = false;
      clearTimeout(timeout);
    };
  }, [store.vendorId, search, categoryId]);

  const result = liveProducts
    ? paginateAndSort(liveProducts, sort, page, PAGE_SIZE)
    : getStoreProducts(store, {
        search,
        categoryId,
        sort,
        availability: "available",
        page,
        pageSize: PAGE_SIZE,
      });

  const hasFilters = search !== "" || categoryId !== "" || sort !== "featured";
  const remaining = result.total - (page * PAGE_SIZE > result.total ? result.total : page * PAGE_SIZE);

  if (isFetching && liveProducts === null) {
    return <StoreProductsSkeleton count={8} />;
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
              {result.total} product{result.total !== 1 ? "s" : ""}
            </span>
            <StoreSortDropdown value={sort} onChange={setSort} />
          </div>
        </div>

        {categories.length > 0 && (
          <div className="border-t border-kampmax-border pt-3">
            <StoreCategories
              categories={categories}
              activeCategoryId={categoryId}
              onCategoryChange={(id) => setCategoryId(id)}
            />
          </div>
        )}
      </div>

      {/* Grid / empty */}
      {result.items.length === 0 ? (
        <StoreEmptyState
          icon={<PackageOpen />}
          title={
            result.total === 0 && !hasFilters
              ? "This store hasn't listed any products yet"
              : "No products match your filters"
          }
          description={
            result.total === 0 && !hasFilters
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
                  setSort("featured");
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
            {result.items.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </ProductGrid>

          {result.totalPages > 1 && page < result.totalPages && (
            <div className="flex justify-center pt-4">
              <Button
                variant="outline"
                onClick={() => setPage((p) => p + 1)}
                className="border-kampmax-border"
              >
                Load more ({Math.max(remaining, 0)} remaining)
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

