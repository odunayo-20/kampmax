"use client";

import { Suspense, useMemo, useState } from "react";
import { Loader2, X } from "lucide-react";
import { Product } from "@/types";
import { useMarketplace } from "@/hooks/useMarketplace";
import { useApp } from "@/lib/app-context";
import { cn } from "@/lib/utils";
import { getVendorById } from "@/services/users";
import { useEnsureVendors } from "@/hooks/use-vendor-cache";
import { SearchBar } from "@/components/shared";
import { PageContainer } from "@/components/layout";
import { Button } from "@/components/atoms/Button";
import { ProductCard } from "./ProductCard";
import { FilterDrawer } from "./FilterDrawer";
import { FilterSidebar } from "./FilterSidebar";
import { SortDropdown } from "./SortDropdown";
import { CategoryTabs } from "./CategoryTabs";
import { ProductGrid } from "./ProductGrid";
import { ProductSkeleton } from "./ProductSkeleton";
import { EmptyMarketplaceState } from "./EmptyMarketplaceState";
import { QuickViewModal } from "./QuickViewModal";
import { RecentlyViewedBar } from "./RecentlyViewedBar";

function MarketplaceContent() {
  const { selectedCampus, campuses } = useApp();
  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null);

  const {
    filters,
    updateFilter,
    clearFilters,
    setCategoryId,
    categories,
    products,
    hasMore,
    loadMore,
    isLoading,
    isFetching,
    isFetchingMore,
    isError,
    retry,
    activeFilterCount,
    mobileFilterOpen,
    setMobileFilterOpen,
    totalCount,
  } = useMarketplace(selectedCampus.id);

  const hasFilters = activeFilterCount > 0 || filters.search.trim() !== "";
  // New results are on their way but the old ones are still showing. Say so, or the page
  // looks as if the filter did nothing.
  const isUpdating = isFetching && !isLoading && !isFetchingMore;

  // Load any vendors not yet in the shared cache; the count re-triggers the
  // memo below once their names arrive.
  const vendorsLoaded = useEnsureVendors(products.map((p) => p.vendorId));

  // Only vendors we actually know about; an unknown store shows no name rather than a placeholder.
  const vendorCache = useMemo(() => {
    const cache: Record<string, { name: string; verified: boolean }> = {};
    products.forEach((p) => {
      const vendor = cache[p.vendorId] ? undefined : getVendorById(p.vendorId);
      if (vendor) cache[p.vendorId] = { name: vendor.storeName, verified: vendor.verified };
    });
    return cache;
  }, [products, vendorsLoaded]);

  // Everything narrowing the results, each with its own way to remove it.
  const campus = campuses.find((c) => c.id === filters.campusId);
  const tags = [
    filters.search.trim() && { key: "search", label: `“${filters.search.trim()}”`, remove: () => updateFilter("search", "") },
    filters.categoryId && {
      key: "category",
      label: categories.find((c) => c.id === filters.categoryId)?.name ?? "Category",
      remove: () => setCategoryId(""),
    },
    filters.campusId && {
      key: "campus",
      label: campus?.abbreviation || campus?.name || "Campus",
      remove: () => updateFilter("campusId", ""),
    },
    filters.vendorId && {
      key: "vendor",
      label: vendorCache[filters.vendorId]?.name || "Store",
      remove: () => updateFilter("vendorId", ""),
    },
    filters.condition && { key: "condition", label: filters.condition, remove: () => updateFilter("condition", "") },
    filters.minPrice && {
      key: "min",
      label: `Min: ₦${Number(filters.minPrice).toLocaleString()}`,
      remove: () => updateFilter("minPrice", ""),
    },
    filters.maxPrice && {
      key: "max",
      label: `Max: ₦${Number(filters.maxPrice).toLocaleString()}`,
      remove: () => updateFilter("maxPrice", ""),
    },
  ].filter((tag): tag is { key: string; label: string; remove: () => void } => !!tag);

  return (
    <PageContainer className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-kampmax-text mb-3">Marketplace</h1>
        <SearchBar
          value={filters.search}
          onChange={(v) => updateFilter("search", v)}
          onFilterClick={() => setMobileFilterOpen(true)}
        />
      </div>

      {/* On large screens the sidebar already lists the categories. */}
      <div className="lg:hidden">
        <CategoryTabs
          categories={categories}
          activeCategoryId={filters.categoryId}
          onCategoryChange={setCategoryId}
        />
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        <FilterSidebar
          filters={filters}
          onFilterChange={updateFilter}
          onClear={clearFilters}
          activeCount={activeFilterCount}
          categories={categories}
          campuses={campuses}
        />

        <div className="flex-1 min-w-0 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm text-kampmax-text-secondary" aria-live="polite">
                {isLoading ? "Loading…" : `${totalCount.toLocaleString()} ${totalCount === 1 ? "product" : "products"}`}
              </span>
              {isUpdating && (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-kampmax-blue" role="status" aria-label="Updating results" />
              )}
              {activeFilterCount > 0 && (
                <button
                  onClick={clearFilters}
                  className="flex items-center gap-1 text-xs text-kampmax-blue hover:underline"
                >
                  <X className="w-3 h-3" />
                  Clear filters
                </button>
              )}
            </div>
            <SortDropdown
              value={filters.sort}
              onChange={(v) => updateFilter("sort", v)}
            />
          </div>

          {tags.length > 0 && (
            <ul className="flex flex-wrap gap-2" aria-label="Active filters">
              {tags.map((tag) => (
                <li key={tag.key}>
                  <FilterChip label={tag.label} onRemove={tag.remove} />
                </li>
              ))}
            </ul>
          )}

          {isError ? (
            <div role="alert" className="rounded-2xl border border-kampmax-border bg-white px-4 py-12 text-center">
              <p className="text-sm font-semibold text-kampmax-text">We couldn&apos;t load products</p>
              <p className="mt-1 text-xs text-kampmax-text-secondary">
                Check your connection and try again.
              </p>
              <Button onClick={retry} variant="outline" className="mt-4 border-kampmax-border">
                Try again
              </Button>
            </div>
          ) : isLoading ? (
            <ProductGrid>
              {Array.from({ length: 8 }).map((_, i) => (
                <ProductSkeleton key={i} />
              ))}
            </ProductGrid>
          ) : products.length > 0 ? (
            <div aria-busy={isUpdating} className={cn("space-y-4 transition-opacity duration-150", isUpdating && "opacity-60")}>
              <ProductGrid>
                {products.map((product) => {
                  const vendor = vendorCache[product.vendorId];
                  return (
                    <ProductCard
                      key={product.id}
                      product={product}
                      vendorName={vendor?.name}
                      vendorVerified={vendor?.verified}
                      onQuickView={setQuickViewProduct}
                    />
                  );
                })}
              </ProductGrid>

              {hasMore && (
                <div className="flex justify-center pt-4">
                  <Button
                    onClick={loadMore}
                    disabled={isFetchingMore}
                    variant="outline"
                    className="border-kampmax-border"
                  >
                    {isFetchingMore
                      ? "Loading…"
                      : `Load more (${Math.max(totalCount - products.length, 0)} remaining)`}
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <EmptyMarketplaceState
              hasFilters={hasFilters}
              onClearFilters={clearFilters}
            />
          )}

          {/* Recently Viewed Bar */}
          <RecentlyViewedBar onQuickView={setQuickViewProduct} />
        </div>
      </div>

      <FilterDrawer
        open={mobileFilterOpen}
        onClose={() => setMobileFilterOpen(false)}
        filters={filters}
        onFilterChange={updateFilter}
        onClear={clearFilters}
        activeCount={activeFilterCount}
        categories={categories}
        campuses={campuses}
      />

      {/* Quick View Modal */}
      <QuickViewModal
        product={quickViewProduct}
        onClose={() => setQuickViewProduct(null)}
      />
    </PageContainer>
  );
}

function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-kampmax-blue/10 text-kampmax-blue text-xs font-medium rounded-full">
      {label}
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove filter: ${label}`}
        className="rounded-full hover:text-kampmax-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-kampmax-blue"
      >
        <X className="w-3 h-3" aria-hidden />
      </button>
    </span>
  );
}

/** The marketplace page: search, filters, sorting and the product grid. */
export function MarketplaceBrowser() {
  return (
    <Suspense
      fallback={
        <PageContainer className="space-y-4">
          <h1 className="text-xl font-bold text-kampmax-text">Marketplace</h1>
          <div className="h-10 bg-kampmax-muted rounded-lg animate-pulse" />
          <div className="flex gap-2 overflow-hidden">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-8 w-20 bg-kampmax-muted rounded-full animate-pulse shrink-0" />
            ))}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <ProductSkeleton key={i} />
            ))}
          </div>
        </PageContainer>
      }
    >
      <MarketplaceContent />
    </Suspense>
  );
}
