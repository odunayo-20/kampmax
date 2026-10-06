"use client";

import { use, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { 
  getCategories, 
  getCategoryById,
  fetchCategories,
} from "@/services/categories";
import { 
  getProductsByCategory,
  fetchProductsByCategory,
} from "@/services/products";
import { getVendorById } from "@/services/users";
import { useEnsureVendors } from "@/hooks/use-vendor-cache";
import { getCampuses } from "@/services/campus";
import { formatNaira } from "@/lib/utils";
import { PageContainer } from "@/components/layout";
import { FeaturedPromotions } from "@/components/home";
import { 
  Breadcrumb,
  CategoryHeader,
  SubcategoryScrollNav,
  CategorySearch,
  ListingToolbar,
  ActiveFilterChips,
  ListingFilterSidebar,
  ListingFilterDrawer,
  ListingProductGrid,
  ListingProductSkeleton,
  ListingEmptyState,
  ProductListingErrorState,
  LoadMore,
  getFilterDefinitionsForCategory,
  buildActiveFilters,
  FilterDefinition,
} from "@/components/marketplace";
import { Product, ProductCondition, SortOption } from "@/types";

interface CategoryPageProps {
  params: Promise<{ categoryId: string }>;
}

const ITEMS_PER_PAGE = 24;

const defaultFilters = {
  search: "",
  campusId: "",
  vendorId: "",
  condition: "" as ProductCondition | "",
  minPrice: "",
  maxPrice: "",
  sort: "recent" as SortOption,
  subcategoryId: "",
};

function filterProducts(products: Product[], filters: typeof defaultFilters): Product[] {
  return products.filter((p) => {
    if (filters.search) {
      const q = filters.search.toLowerCase();
      if (!p.title.toLowerCase().includes(q) && 
          !p.description.toLowerCase().includes(q) && 
          !p.tags?.some((t) => t.toLowerCase().includes(q))) {
        return false;
      }
    }
    if (filters.campusId && p.campusId !== filters.campusId) return false;
    if (filters.vendorId && p.vendorId !== filters.vendorId) return false;
    if (filters.condition && p.condition !== filters.condition) return false;
    if (filters.minPrice) {
      const min = parseFloat(filters.minPrice);
      if (!isNaN(min) && p.price < min) return false;
    }
    if (filters.maxPrice) {
      const max = parseFloat(filters.maxPrice);
      if (!isNaN(max) && p.price > max) return false;
    }
    return true;
  });
}

function sortProducts(products: Product[], sort: SortOption): Product[] {
  const sorted = [...products];
  switch (sort) {
    case "price_low":
      return sorted.sort((a, b) => a.price - b.price);
    case "price_high":
      return sorted.sort((a, b) => b.price - a.price);
    case "popular":
      return sorted.sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0));
    case "rating":
      return sorted.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    case "recent":
    default:
      return sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
}

function CategoryPageContent({ params }: CategoryPageProps) {
  const { categoryId } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();

  const [filters, setFilters] = useState({ ...defaultFilters });
  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE);
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [error, setError] = useState<string | null>(null);

  const [categories, setCategories] = useState(() => getCategories());
  const [allProducts, setAllProducts] = useState<Product[]>(() =>
    getProductsByCategory(categoryId).filter((p) => p.status === "available")
  );

  const category = categories.find((c) => c.id === categoryId) || getCategoryById(categoryId);
  const filterDefinitions = useMemo(() => getFilterDefinitionsForCategory(categoryId), [categoryId]);

  // Hydrate categories and products
  useEffect(() => {
    let mounted = true;
    fetchCategories().then((res) => {
      if (mounted && res.data && res.data.length > 0) {
        setCategories(res.data);
      }
    });

    fetchProductsByCategory(categoryId, undefined, { status: "ACTIVE", limit: 100 }).then((res) => {
      if (mounted && !res.error) {
        setAllProducts(res.data.filter((p) => p.status === "available"));
      }
    });

    return () => {
      mounted = false;
    };
  }, [categoryId]);

  // Initialize filters from URL
  useEffect(() => {
    const urlFilters: Partial<typeof defaultFilters> = {};
    if (searchParams.get("campus")) urlFilters.campusId = searchParams.get("campus")!;
    if (searchParams.get("sort")) urlFilters.sort = searchParams.get("sort")! as SortOption;
    if (searchParams.get("minPrice")) urlFilters.minPrice = searchParams.get("minPrice")!;
    if (searchParams.get("maxPrice")) urlFilters.maxPrice = searchParams.get("maxPrice")!;
    if (searchParams.get("condition")) urlFilters.condition = searchParams.get("condition")! as ProductCondition;
    if (searchParams.get("search")) urlFilters.search = searchParams.get("search")!;
    if (searchParams.get("vendor")) urlFilters.vendorId = searchParams.get("vendor")!;
    if (searchParams.get("subcategory")) urlFilters.subcategoryId = searchParams.get("subcategory")!;
    
    setFilters(prev => ({ ...prev, ...urlFilters }));
    setVisibleCount(ITEMS_PER_PAGE);
  }, [searchParams, categoryId]);

  const filteredProducts = useMemo(() => {
    const filtered = filterProducts(allProducts, filters);
    return sortProducts(filtered, filters.sort);
  }, [allProducts, filters]);

  const displayedProducts = filteredProducts.slice(0, visibleCount);
  const hasMore = visibleCount < filteredProducts.length;
  const activeFilterCount = Object.entries(filters).filter(([k, v]) => k !== "sort" && k !== "subcategoryId" && v).length;

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

  const activeFilters = buildActiveFilters(filters, categoryId);

  const updateFilter = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value as never }));
    setVisibleCount(ITEMS_PER_PAGE);
  };

  const clearFilters = () => {
    setFilters({ ...defaultFilters });
    setVisibleCount(ITEMS_PER_PAGE);
  };

  const loadMore = () => {
    setVisibleCount(prev => prev + ITEMS_PER_PAGE);
  };

  if (!category) {
    return (
      <ProductListingErrorState 
        message="Category not found" 
        onRetry={() => router.back()} 
      />
    );
  }

  const breadcrumbItems = [
    { label: "Marketplace", href: "/marketplace" },
    { label: category.name, href: `/marketplace?category=${categoryId}` },
  ];

  return (
    <div className="pb-8">
      {/* Breadcrumb */}
      <div className="hidden lg:block border-b border-neutral-200 bg-white">
        <PageContainer className="py-3">
          <Breadcrumb items={breadcrumbItems} />
        </PageContainer>
      </div>

      <PageContainer className="py-4 lg:py-6">
        {/* Category Header */}
        <CategoryHeader
          name={category.name}
          description={category.icon ? `Discover ${category.name.toLowerCase()} from trusted vendors around your campus.` : undefined}
          productCount={filteredProducts.length}
        />

        {/* Featured in this category */}
        <div className="mb-4">
          <FeaturedPromotions
            placement="category_strip"
            campusId={filters.campusId || undefined}
            categoryId={categoryId}
            title="Featured in this category"
          />
        </div>

        {/* Mobile Breadcrumb */}
        <div className="lg:hidden mb-4">
          <Breadcrumb items={breadcrumbItems} />
        </div>

        {/* Subcategory Navigation */}
        {/* Subcategories would come from API - placeholder for now */}
        {/* <SubcategoryScrollNav
          subcategories={[]}
          activeSubcategoryId={filters.subcategoryId}
          onSubcategoryChange={(id) => updateFilter("subcategoryId", id)}
        /> */}

        {/* Search & Filter Toolbar */}
        <div className="space-y-4">
          <CategorySearch
            value={filters.search}
            onChange={(v) => updateFilter("search", v)}
            onFilterClick={() => setMobileFilterOpen(true)}
            placeholder={`Search ${category.name.toLowerCase()}...`}
          />

          <ListingToolbar
            totalCount={allProducts.length}
            filteredCount={filteredProducts.length}
            sort={filters.sort}
            onSortChange={(v) => updateFilter("sort", v)}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
          />

          <ActiveFilterChips
            filters={activeFilters}
            onRemove={(key) => {
              const def = filterDefinitions.find(d => key.startsWith(d.key));
              if (def) updateFilter(def.key as keyof typeof defaultFilters, "");
            }}
            onClearAll={clearFilters}
          />
        </div>

        {/* Product Grid + Filters */}
        <div className="flex flex-col lg:flex-row gap-6 mt-4">
          <ListingFilterSidebar
            filters={filters}
            onFilterChange={updateFilter}
            onClear={clearFilters}
            activeCount={activeFilterCount}
            categories={categories}
            campuses={getCampuses()}
            categoryId={categoryId}
            definitions={filterDefinitions}
          />

          <div className="flex-1 min-w-0">
            {error && <ProductListingErrorState message={error} onRetry={() => window.location.reload()} />}

            {filteredProducts.length > 0 ? (
              <>
                <ListingProductGrid viewMode={viewMode}>
                  {displayedProducts.map((product) => {
                    const vendor = vendorCache[product.vendorId];
                    const hasDiscount = !!product.originalPrice && product.originalPrice > product.price;
                    const discountPct = hasDiscount 
                      ? Math.round(((product.originalPrice! - product.price) / product.originalPrice!) * 100) 
                      : 0;

                    return (
                      <ProductCard
                        key={product.id}
                        product={product}
                        vendorName={vendor?.name}
                        vendorVerified={vendor?.verified}
                        viewMode={viewMode}
                      />
                    );
                  })}
                </ListingProductGrid>

                <LoadMore
                  hasMore={hasMore}
                  onLoadMore={loadMore}
                  remainingCount={filteredProducts.length - displayedProducts.length}
                />
              </>
            ) : (
              <ListingEmptyState
                hasFilters={activeFilterCount > 0 || filters.search !== ""}
                onClearFilters={clearFilters}
                categoryName={category.name}
              />
            )}
          </div>
        </div>
      </PageContainer>

      {/* Mobile Filter Drawer */}
      <ListingFilterDrawer
        open={mobileFilterOpen}
        onClose={() => setMobileFilterOpen(false)}
        filters={filters}
        onFilterChange={updateFilter}
        onClear={clearFilters}
        activeCount={activeFilterCount}
        categories={categories}
        campuses={getCampuses()}
        categoryId={categoryId}
        definitions={filterDefinitions}
      />
    </div>
  );
}

interface ProductCardProps {
  product: Product;
  vendorName?: string;
  vendorVerified?: boolean;
  viewMode?: "grid" | "list";
}

function ProductCard({ product, vendorName, vendorVerified, viewMode = "grid" }: ProductCardProps) {
  const hasDiscount = !!product.originalPrice && product.originalPrice > product.price;
  const discountPct = hasDiscount 
    ? Math.round(((product.originalPrice! - product.price) / product.originalPrice!) * 100) 
    : 0;

  return (
    <a
      href={`/marketplace/${product.id}`}
      className="group bg-white rounded-[10px] border border-neutral-200 overflow-hidden flex flex-col transition-all hover:border-neutral-300 hover:shadow-sm"
      aria-label={`View ${product.title}`}
    >
      <div className="relative aspect-square bg-neutral-50 overflow-hidden">
        <div className="w-full h-full flex items-center justify-center text-neutral-400/40">
          <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.25} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
        </div>

        {hasDiscount && (
          <div className="absolute top-2 left-2">
            <span className="bg-error-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md leading-none">
              -{discountPct}%
            </span>
          </div>
        )}

        <div className="absolute bottom-2 left-2">
          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md leading-none border ${
            product.condition === "New"
              ? "bg-primary-50 text-primary-700 border-primary-100"
              : "bg-accent-50 text-accent-700 border-accent-100"
          }`}>
            {product.condition}
          </span>
        </div>
      </div>

      <div className="p-3 flex flex-col flex-1">
        {vendorName && (
          <div className="flex items-center gap-1 mb-1">
            <span className="text-[11px] text-neutral-500 truncate">{vendorName}</span>
            {vendorVerified && (
              <svg className="w-3 h-3 text-primary-600 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            )}
          </div>
        )}

        <h3 className="text-sm font-semibold text-neutral-900 line-clamp-2 leading-snug mb-1 group-hover:text-primary-600 transition-colors">
          {product.title}
        </h3>

        {product.location && (
          <div className="flex items-center gap-0.5 mb-1.5">
            <svg className="w-3 h-3 text-neutral-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            <span className="text-[11px] text-neutral-500 truncate">{product.location}</span>
          </div>
        )}

        <div className="mt-auto">
          <div className="flex items-baseline gap-1.5">
            <span className="text-[15px] font-bold text-primary-900 tracking-tight">{formatNaira(product.price)}</span>
            {hasDiscount && (
              <span className="text-xs text-neutral-400 line-through">{formatNaira(product.originalPrice!)}</span>
            )}
          </div>

          {(product.rating || product.viewCount) && (
            <div className="flex items-center gap-2 mt-1">
              {product.rating && (
                <div className="flex items-center gap-0.5">
                  <svg className="w-3 h-3 fill-accent-500 text-accent-500" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                  <span className="text-[11px] font-medium text-neutral-900">{product.rating.toFixed(1)}</span>
                  {product.ratingCount && (
                    <span className="text-[11px] text-neutral-500">({product.ratingCount})</span>
                  )}
                </div>
              )}
              {product.viewCount && (
                <span className="text-[11px] text-neutral-500">{product.viewCount} views</span>
              )}
            </div>
          )}
        </div>
      </div>
    </a>
  );
}

export default function CategoryPage({ params }: CategoryPageProps) {
  return (
    <Suspense
      fallback={
        <PageContainer className="py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 w-48 bg-neutral-100 rounded" />
            <div className="h-10 bg-neutral-100 rounded-lg" />
            <div className="flex gap-2 overflow-x-auto">
              {[1,2,3,4,5].map(i => <div key={i} className="h-8 w-24 bg-neutral-100 rounded-full shrink-0" />)}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {[...Array(8)].map((_, i) => <ListingProductSkeleton key={i} />)}
            </div>
          </div>
        </PageContainer>
      }
    >
      <CategoryPageContent params={params} />
    </Suspense>
  );
}