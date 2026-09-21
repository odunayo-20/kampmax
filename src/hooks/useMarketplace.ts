"use client";

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { MarketplaceFilters, Product, SortOption } from "@/types";
import { getProducts, fetchProducts, ProductQueryParams } from "@/services/products";
import { getCategories, fetchCategories } from "@/services/categories";

const ITEMS_PER_PAGE = 12;

const defaultFilters: MarketplaceFilters = {
  search: "",
  categoryId: "",
  campusId: "",
  vendorId: "",
  condition: "",
  minPrice: "",
  maxPrice: "",
  sort: "recent",
};

function sortProducts(products: Product[], sort: SortOption): Product[] {
  const sorted = [...products];
  switch (sort) {
    case "price_low":
      return sorted.sort((a, b) => a.price - b.price);
    case "price_high":
      return sorted.sort((a, b) => b.price - a.price);
    case "popular":
      return sorted.sort(
        (a, b) => (b.viewCount || 0) - (a.viewCount || 0)
      );
    case "rating":
      return sorted.sort(
        (a, b) => (b.rating || 0) - (a.rating || 0)
      );
    case "recent":
    default:
      return sorted.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
  }
}

function filterProducts(
  products: Product[],
  filters: MarketplaceFilters
): Product[] {
  return products.filter((p) => {
    if (filters.search) {
      const q = filters.search.toLowerCase();
      const matchesSearch =
        p.title.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.tags?.some((t) => t.toLowerCase().includes(q));
      if (!matchesSearch) return false;
    }
    if (filters.categoryId && p.categoryId !== filters.categoryId) return false;
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

export function useMarketplace(initialCampusId?: string) {
  const [filters, setFilters] = useState<MarketplaceFilters>({
    ...defaultFilters,
    campusId: initialCampusId || "",
  });
  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE);
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [categories, setCategories] = useState(() => getCategories());
  const [serverProducts, setServerProducts] = useState<Product[]>(() => getProducts());

  // Sync campusId if initialCampusId changes
  useEffect(() => {
    if (initialCampusId) {
      setFilters((prev) => ({
        ...prev,
        campusId: initialCampusId,
      }));
    }
  }, [initialCampusId]);

  // Hydrate categories from API
  useEffect(() => {
    let mounted = true;
    fetchCategories().then((res) => {
      if (mounted && res.data && res.data.length > 0) {
        setCategories(res.data);
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  // Fetch live products when filters change (with debounced search)
  const fetchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const loadProducts = useCallback(async (currentFilters: MarketplaceFilters) => {
    setIsLoading(true);
    try {
      const queryParams: ProductQueryParams = {
        limit: 50,
      };
      if (currentFilters.search) queryParams.search = currentFilters.search;
      if (currentFilters.campusId) queryParams.campusId = currentFilters.campusId;
      if (currentFilters.categoryId) queryParams.categoryId = currentFilters.categoryId;
      if (currentFilters.vendorId) queryParams.vendorId = currentFilters.vendorId;
      if (currentFilters.minPrice) {
        const min = parseFloat(currentFilters.minPrice);
        if (!isNaN(min)) queryParams.minPrice = min;
      }
      if (currentFilters.maxPrice) {
        const max = parseFloat(currentFilters.maxPrice);
        if (!isNaN(max)) queryParams.maxPrice = max;
      }

      const res = await fetchProducts(queryParams);
      if (res.data && res.data.length > 0) {
        setServerProducts(res.data);
      }
    } catch {
      // Failover gracefully to cached/mock products
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (fetchTimeoutRef.current) {
      clearTimeout(fetchTimeoutRef.current);
    }

    // Debounce if user is actively searching
    const delay = filters.search ? 300 : 0;
    fetchTimeoutRef.current = setTimeout(() => {
      loadProducts(filters);
    }, delay);

    return () => {
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }
    };
  }, [filters, loadProducts]);

  const filteredProducts = useMemo(() => {
    const available = serverProducts.filter((p) => p.status === "available");
    const filtered = filterProducts(available, filters);
    return sortProducts(filtered, filters.sort);
  }, [serverProducts, filters]);

  const displayedProducts = useMemo(
    () => filteredProducts.slice(0, visibleCount),
    [filteredProducts, visibleCount]
  );

  const hasMore = visibleCount < filteredProducts.length;

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.categoryId) count++;
    if (filters.campusId) count++;
    if (filters.vendorId) count++;
    if (filters.condition) count++;
    if (filters.minPrice) count++;
    if (filters.maxPrice) count++;
    return count;
  }, [filters]);

  const updateFilter = useCallback(
    <K extends keyof MarketplaceFilters>(
      key: K,
      value: MarketplaceFilters[K]
    ) => {
      setFilters((prev) => ({ ...prev, [key]: value }));
      setVisibleCount(ITEMS_PER_PAGE);
    },
    []
  );

  const clearFilters = useCallback(() => {
    setFilters({ ...defaultFilters, campusId: filters.campusId });
    setVisibleCount(ITEMS_PER_PAGE);
  }, [filters.campusId]);

  const loadMore = useCallback(() => {
    setVisibleCount((prev) => prev + ITEMS_PER_PAGE);
  }, []);

  const setCategoryId = useCallback((categoryId: string) => {
    setFilters((prev) => ({ ...prev, categoryId }));
    setVisibleCount(ITEMS_PER_PAGE);
  }, []);

  return {
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
    isLoading,
    reloadProducts: () => loadProducts(filters),
    totalCount: filteredProducts.length,
  };
}
