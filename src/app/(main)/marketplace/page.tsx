"use client";

import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { X } from "lucide-react";
import { Product } from "@/types";
import { useMarketplace } from "@/hooks/useMarketplace";
import { useApp } from "@/lib/app-context";
import { getCampuses } from "@/services/campus";
import { getVendorById } from "@/services/users";
import { useEnsureVendors } from "@/hooks/use-vendor-cache";
import { SearchBar } from "@/components/shared";
import { PageContainer } from "@/components/layout";
import {
  ProductCard,
  FilterDrawer,
  FilterSidebar,
  SortDropdown,
  CategoryTabs,
  ProductGrid,
  ProductSkeleton,
  EmptyMarketplaceState,
  QuickViewModal,
  RecentlyViewedBar,
} from "@/components/marketplace";
import { Button } from "@/components/atoms/Button";

function MarketplaceContent() {
  const searchParams = useSearchParams();
  const { selectedCampus, campuses } = useApp();
  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null);

  const {
    filters,
    updateFilter,
    clearFilters,
    setCategoryId,
    categories,
    filteredProducts,
    displayedProducts,
    hasMore,
    loadMore,
    activeFilterCount,
    mobileFilterOpen,
    setMobileFilterOpen,
    totalCount,
  } = useMarketplace(selectedCampus.id);

  const hasFilters = activeFilterCount > 0 || filters.search !== "";

  // Load any vendors not yet in the shared cache; the count re-triggers the
  // memo below once their names arrive.
  const vendorsLoaded = useEnsureVendors(displayedProducts.map((p) => p.vendorId));

  const vendorCache = useMemo(() => {
    const cache: Record<string, { name: string; verified: boolean }> = {};
    filteredProducts.forEach((p) => {
      if (!cache[p.vendorId]) {
        const vendor = getVendorById(p.vendorId);
        cache[p.vendorId] = {
          name: vendor?.storeName || "Unknown",
          verified: vendor?.verified || false,
        };
      }
    });
    return cache;
  }, [filteredProducts, vendorsLoaded]);

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

      <CategoryTabs
        categories={categories}
        activeCategoryId={filters.categoryId}
        onCategoryChange={setCategoryId}
      />

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
              <span className="text-sm text-kampmax-text-secondary">
                {totalCount} {totalCount === 1 ? "product" : "products"}
              </span>
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

          {(filters.campusId || filters.vendorId || filters.condition || filters.minPrice || filters.maxPrice) && (
            <div className="flex flex-wrap gap-2">
              {filters.campusId && (
                <FilterChip
                  label={campuses.find((c) => c.id === filters.campusId)?.abbreviation || filters.campusId}
                  onRemove={() => updateFilter("campusId", "")}
                />
              )}
              {filters.vendorId && (
                <FilterChip
                  label={vendorCache[filters.vendorId]?.name || filters.vendorId}
                  onRemove={() => updateFilter("vendorId", "")}
                />
              )}
              {filters.condition && (
                <FilterChip
                  label={filters.condition}
                  onRemove={() => updateFilter("condition", "")}
                />
              )}
              {filters.minPrice && (
                <FilterChip
                  label={`Min: ₦${Number(filters.minPrice).toLocaleString()}`}
                  onRemove={() => updateFilter("minPrice", "")}
                />
              )}
              {filters.maxPrice && (
                <FilterChip
                  label={`Max: ₦${Number(filters.maxPrice).toLocaleString()}`}
                  onRemove={() => updateFilter("maxPrice", "")}
                />
              )}
            </div>
          )}

          {filteredProducts.length > 0 ? (
            <>
              <ProductGrid>
                {displayedProducts.map((product) => {
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
                    variant="outline"
                    className="border-kampmax-border"
                  >
                    Load more ({filteredProducts.length - displayedProducts.length} remaining)
                  </Button>
                </div>
              )}
            </>
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
    <span className="inline-flex items-center gap-1 px-2 py-1 bg-kampmax-blue/10 text-kampmax-blue text-xs font-medium rounded-full">
      {label}
      <button onClick={onRemove} className="hover:text-kampmax-navy">
        <X className="w-3 h-3" />
      </button>
    </span>
  );
}

export default function MarketplacePage() {
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
