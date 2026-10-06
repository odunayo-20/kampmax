"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { keepPreviousData, useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { MarketplaceFilters, ProductCondition, SortOption } from "@/types";
import { fetchProducts, ProductQueryParams } from "@/services/products";
import { fetchCategories } from "@/services/categories";
import { toApiCampusId } from "@/hooks/use-home";

const PAGE_SIZE = 12;
const SEARCH_DEBOUNCE_MS = 300;

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

/** The backend orders by newest or by price; other sorts have no data behind them. */
const SERVER_SORTS: Record<SortOption, NonNullable<ProductQueryParams["sort"]>> = {
  recent: "recent",
  price_low: "price_low",
  price_high: "price_high",
  popular: "recent",
  rating: "recent",
};

/** The UI offers New / Used; refurbished items are shown as Used. */
const CONDITION_PARAM: Partial<Record<ProductCondition, string>> = {
  New: "NEW",
  Used: "USED,REFURBISHED",
};

function useDebounced<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}

function toQuery(filters: MarketplaceFilters, search: string): ProductQueryParams {
  // Public browse only ever shows purchasable listings; drafts, pending review,
  // suspended and archived products belong to the vendor's own dashboard.
  const query: ProductQueryParams = {
    status: "ACTIVE",
    sort: SERVER_SORTS[filters.sort],
    limit: PAGE_SIZE,
  };
  if (search) query.search = search;
  const campusId = toApiCampusId(filters.campusId);
  if (campusId) query.campusId = campusId;
  if (filters.categoryId) query.categoryId = filters.categoryId;
  if (filters.vendorId) query.vendorId = filters.vendorId;
  const condition = filters.condition ? CONDITION_PARAM[filters.condition] : undefined;
  if (condition) query.condition = condition;
  const min = parseFloat(filters.minPrice);
  if (!isNaN(min)) query.minPrice = min;
  const max = parseFloat(filters.maxPrice);
  if (!isNaN(max)) query.maxPrice = max;
  return query;
}

/**
 * Marketplace browsing. Filtering, sorting and paging all happen on the server,
 * so the result count and "Load more" reflect the whole catalogue — never just
 * the first page that happened to be loaded.
 */
export function useMarketplace(initialCampusId?: string) {
  // Links such as /marketplace?category=<id> or ?vendor=<id> open pre-filtered.
  const searchParams = useSearchParams();
  const [filters, setFilters] = useState<MarketplaceFilters>(() => ({
    ...defaultFilters,
    campusId: initialCampusId || "",
    categoryId: searchParams.get("category") ?? "",
    vendorId: searchParams.get("vendor") ?? "",
    search: searchParams.get("q") ?? searchParams.get("search") ?? "",
    minPrice: searchParams.get("minPrice") ?? "",
    maxPrice: searchParams.get("maxPrice") ?? "",
    condition: (["New", "Used"] as const).find((c) => c.toLowerCase() === searchParams.get("condition")?.toLowerCase()) ?? "",
    sort: (["recent", "price_low", "price_high"] as const).find((o) => o === searchParams.get("sort")) ?? "recent",
  }));
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  // Following a link while already on the page (e.g. another category) re-applies it.
  const urlCategory = searchParams.get("category") ?? "";
  const urlVendor = searchParams.get("vendor") ?? "";
  useEffect(() => {
    setFilters((prev) =>
      prev.categoryId === urlCategory && prev.vendorId === urlVendor
        ? prev
        : { ...prev, categoryId: urlCategory, vendorId: urlVendor }
    );
  }, [urlCategory, urlVendor]);

  // Follow the selected campus once it is known.
  useEffect(() => {
    if (initialCampusId) {
      setFilters((prev) => ({ ...prev, campusId: initialCampusId }));
    }
  }, [initialCampusId]);

  const debouncedSearch = useDebounced(filters.search.trim(), SEARCH_DEBOUNCE_MS);

  const categoriesQuery = useQuery({
    queryKey: ["marketplace", "categories"],
    queryFn: async () => {
      const res = await fetchCategories({ limit: 50 });
      if (res.error) throw res.error;
      return res.data;
    },
    staleTime: 5 * 60_000,
  });

  const productsQuery = useInfiniteQuery({
    queryKey: ["marketplace", "products", toQuery(filters, debouncedSearch)],
    initialPageParam: 1,
    placeholderData: keepPreviousData,
    queryFn: async ({ pageParam }) => {
      const res = await fetchProducts({ ...toQuery(filters, debouncedSearch), page: pageParam });
      if (res.error) throw res.error;
      return res;
    },
    getNextPageParam: (last) => (last.page < last.totalPages ? last.page + 1 : undefined),
  });

  const products = useMemo(
    () =>
      (productsQuery.data?.pages ?? [])
        .flatMap((page) => page.data)
        .filter((p) => p.status === "available"),
    [productsQuery.data]
  );
  const totalCount = productsQuery.data?.pages[0]?.total ?? 0;

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
    <K extends keyof MarketplaceFilters>(key: K, value: MarketplaceFilters[K]) => {
      setFilters((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  const clearFilters = useCallback(() => {
    setFilters((prev) => ({ ...defaultFilters, campusId: prev.campusId }));
  }, []);

  const setCategoryId = useCallback((categoryId: string) => {
    setFilters((prev) => ({ ...prev, categoryId }));
  }, []);

  return {
    filters,
    updateFilter,
    clearFilters,
    setCategoryId,
    categories: categoriesQuery.data ?? [],
    products,
    totalCount,
    hasMore: productsQuery.hasNextPage ?? false,
    loadMore: () => void productsQuery.fetchNextPage(),
    isLoading: productsQuery.isPending,
    isFetching: productsQuery.isFetching,
    isFetchingMore: productsQuery.isFetchingNextPage,
    isError: productsQuery.isError,
    retry: () => void productsQuery.refetch(),
    activeFilterCount,
    mobileFilterOpen,
    setMobileFilterOpen,
  };
}
