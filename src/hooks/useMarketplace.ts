"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { keepPreviousData, useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { MarketplaceFilters, ProductCondition, SortOption } from "@/types";
import { fetchProducts, ProductQueryParams } from "@/services/products";
import { fetchCategories } from "@/services/categories";
import { toApiCampusId } from "@/hooks/use-home";
import { DEFAULT_FILTERS, filtersFromParams, paramsFromFilters, sameFilters } from "@/lib/marketplace-url";

const PAGE_SIZE = 12;
/** How long typing (a search, a price) pauses before it searches and updates the address. */
const SETTLE_MS = 350;

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

function toQuery(filters: MarketplaceFilters): ProductQueryParams {
  // Public browse only ever shows purchasable listings; drafts, pending review,
  // suspended and archived products belong to the vendor's own dashboard.
  const query: ProductQueryParams = {
    status: "ACTIVE",
    sort: SERVER_SORTS[filters.sort],
    limit: PAGE_SIZE,
  };
  const search = filters.search.trim();
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
 *
 * The filters live in the address too (`/marketplace?category=…&minPrice=…`), so a
 * filtered view can be shared, bookmarked and survives a refresh.
 */
export function useMarketplace(initialCampusId?: string) {
  const defaultCampus = initialCampusId || "";
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [isNavigating, startTransition] = useTransition();

  const [filters, setFilters] = useState<MarketplaceFilters>(() => filtersFromParams(searchParams, defaultCampus));
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  // The address we last wrote (or read). Tells our own changes to the address, which come
  // back to us as an "address changed" event, apart from a link followed from elsewhere.
  const urlString = searchParams.toString();
  const lastSeen = useRef(urlString);

  // Address -> filters: a link followed from elsewhere (another category, a store's page),
  // or back/forward. Ignored while our own change is still on its way, so a slow reply
  // can't overwrite what has been typed since.
  useEffect(() => {
    if (isNavigating || urlString === lastSeen.current) return;
    lastSeen.current = urlString;
    const fromUrl = filtersFromParams(new URLSearchParams(urlString), defaultCampus);
    setFilters((prev) => (sameFilters(prev, fromUrl) ? prev : fromUrl));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- react to the address changing, nothing else
  }, [urlString]);

  // Follow the selected campus once it is known, unless the address picked a campus itself.
  const addressPicksCampus = searchParams.get("campus") !== null;
  useEffect(() => {
    if (initialCampusId && !addressPicksCampus) {
      setFilters((prev) => (prev.campusId === initialCampusId ? prev : { ...prev, campusId: initialCampusId }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only when the selected campus changes
  }, [initialCampusId]);

  // Typing (a search, a price) waits for a pause before it searches; choices (a category,
  // a sort) take effect straight away.
  const settled = useDebounced(filters, SETTLE_MS);
  const queryFilters = useMemo(
    () => ({ ...filters, search: settled.search, minPrice: settled.minPrice, maxPrice: settled.maxPrice }),
    [filters, settled.search, settled.minPrice, settled.maxPrice]
  );

  // Filters -> address, once everything has settled. While a change is still being typed,
  // `settled` is behind `filters`, and writing then would put the old values back.
  const toWrite = sameFilters(settled, filters) ? paramsFromFilters(filters, defaultCampus).toString() : null;
  useEffect(() => {
    if (toWrite === null || toWrite === lastSeen.current) return;
    lastSeen.current = toWrite;
    startTransition(() => router.replace(toWrite ? `${pathname}?${toWrite}` : pathname, { scroll: false }));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only when what we'd write changes
  }, [toWrite]);

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
    queryKey: ["marketplace", "products", toQuery(queryFilters)],
    initialPageParam: 1,
    placeholderData: keepPreviousData,
    queryFn: async ({ pageParam }) => {
      const res = await fetchProducts({ ...toQuery(queryFilters), page: pageParam });
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

  // What the visitor has narrowed things down by. Their own campus is applied for them, so
  // it only counts when they've picked a different one.
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.categoryId) count++;
    if (filters.campusId && filters.campusId !== defaultCampus) count++;
    if (filters.vendorId) count++;
    if (filters.condition) count++;
    if (filters.minPrice) count++;
    if (filters.maxPrice) count++;
    return count;
  }, [filters, defaultCampus]);

  const updateFilter = useCallback(
    <K extends keyof MarketplaceFilters>(key: K, value: MarketplaceFilters[K]) => {
      setFilters((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  const clearFilters = useCallback(() => {
    setFilters((prev) => ({ ...DEFAULT_FILTERS, campusId: prev.campusId }));
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
