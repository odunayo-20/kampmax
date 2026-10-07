"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import type { MarketplaceService } from "@/types/service-marketplace";
import { useApp } from "@/lib/app-context";
import { useDebounce } from "@/hooks/use-debounce";
import { campuses } from "@/data/campus";
import { useCategoryTree } from "@/hooks/use-taxonomy";
import { findTaxonomyNode } from "@/services/taxonomy";
import {
  categoryIdsFor,
  fetchCategoryCounts,
  fetchServicePage,
  getServiceCategories,
} from "@/services/service-marketplace";
import {
  defaultServiceFilters,
  PRICE_BUCKET_OPTIONS,
  LOCATION_OPTIONS,
  SORT_OPTIONS,
  type ServiceMarketplaceFilters,
} from "@/components/service-marketplace/constants";

/** Browse categories: the root nodes of the SERVICE taxonomy (API), with live counts. */
export function useServiceCategories() {
  const { data: tree } = useCategoryTree("SERVICE");
  const counts = useQuery({
    queryKey: ["services", "category-counts"],
    queryFn: fetchCategoryCounts,
    staleTime: 60_000,
    retry: false,
  });
  return useMemo(() => getServiceCategories(tree ?? [], counts.data ?? {}), [tree, counts.data]);
}

const PAGE_SIZE = 12;
const RATING_CHOICES = [2, 3, 4];

export interface UseServiceMarketplaceOptions {
  /** Base route for search/filter URLs (default `/services`). */
  basePath?: string;
  /** Lock the category filter to one id (category landing pages). */
  lockedCategoryId?: string;
}

function parseSearchParams(sp: URLSearchParams, lockedCategoryId?: string): { filters: ServiceMarketplaceFilters; page: number } {
  const filters: ServiceMarketplaceFilters = { ...defaultServiceFilters };
  const q = sp.get("q");
  if (q) filters.q = q;
  const category = sp.get("category");
  // A taxonomy id or slug; resolved against the loaded SERVICE tree at fetch time.
  if (category) filters.categoryId = category;
  if (lockedCategoryId) filters.categoryId = lockedCategoryId;
  const campus = sp.get("campus");
  if (campus) filters.campusId = campus;
  const rating = Number(sp.get("rating"));
  filters.ratingMin = RATING_CHOICES.includes(rating) ? rating : 0;
  const price = sp.get("price");
  filters.priceBucket = PRICE_BUCKET_OPTIONS.some((o) => o.value === price) ? (price as ServiceMarketplaceFilters["priceBucket"]) : "";
  const location = sp.get("location");
  filters.locationType = LOCATION_OPTIONS.some((o) => o.value === location) ? (location as ServiceMarketplaceFilters["locationType"]) : "";
  const sort = sp.get("sort");
  filters.sort = SORT_OPTIONS.some((o) => o.value === sort) ? (sort as ServiceMarketplaceFilters["sort"]) : "recommended";
  const pageRaw = Number(sp.get("page"));
  const page = Number.isInteger(pageRaw) && pageRaw > 1 ? pageRaw : 1;
  return { filters, page };
}

function buildSearchUrl(
  filters: ServiceMarketplaceFilters,
  page: number,
  basePath = "/services",
  lockedCategoryId?: string
): string {
  const sp = new URLSearchParams();
  if (filters.q) sp.set("q", filters.q);
  if (lockedCategoryId) sp.set("category", lockedCategoryId);
  else if (filters.categoryId) sp.set("category", filters.categoryId);
  if (filters.campusId) sp.set("campus", filters.campusId);
  if (filters.ratingMin) sp.set("rating", String(filters.ratingMin));
  if (filters.priceBucket) sp.set("price", filters.priceBucket);
  if (filters.locationType) sp.set("location", filters.locationType);
  if (filters.sort && filters.sort !== "recommended") sp.set("sort", filters.sort);
  if (page > 1) sp.set("page", String(page));
  const qs = sp.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

function filtersEqual(a: ServiceMarketplaceFilters, b: ServiceMarketplaceFilters): boolean {
  return (
    a.q === b.q &&
    a.categoryId === b.categoryId &&
    a.campusId === b.campusId &&
    a.ratingMin === b.ratingMin &&
    a.priceBucket === b.priceBucket &&
    a.locationType === b.locationType &&
    a.sort === b.sort
  );
}

/**
 * Owns everything the browse page needs: filter state mirrored to URL search
 * params (state-preserving refresh/back), a debounced query, and paginated
 * results from the live catalogue.
 */
export function useServiceMarketplace(options?: UseServiceMarketplaceOptions) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { selectedCampus } = useApp();

  const basePath = options?.basePath ?? "/services";
  const lockedCategoryId = options?.lockedCategoryId;

  const [filters, setFilters] = useState<ServiceMarketplaceFilters>(defaultServiceFilters);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [services, setServices] = useState<MarketplaceService[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [resultCount, setResultCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);

  const { data: categoryTree } = useCategoryTree("SERVICE");
  const categories = useServiceCategories();
  const campusOptions = useMemo(
    () => campuses.map((c) => ({ id: c.id, name: c.name, abbreviation: c.abbreviation })),
    []
  );

  // Keep local state in sync with the URL (first load, refresh, back/forward).
  useEffect(() => {
    const { filters: parsed, page: parsedPage } = parseSearchParams(searchParams, lockedCategoryId);
    setFilters((prev) => (filtersEqual(prev, parsed) ? prev : parsed));
    setPage(parsedPage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, lockedCategoryId]);

  const debouncedQ = useDebounce(filters.q, 350);

  // Fetch. Debounced query only fires 350ms after the user stops typing.
  useEffect(() => {
    // A category filter can only be resolved once the taxonomy has loaded.
    if (filters.categoryId && !categoryTree) return;
    setIsLoading(true);
    const node = filters.categoryId && categoryTree ? findTaxonomyNode(categoryTree, filters.categoryId) : undefined;
    let cancelled = false;
    const timeout = setTimeout(() => {
      fetchServicePage({
        q: debouncedQ,
        categoryId: filters.categoryId || undefined,
        categoryIds: node ? categoryIdsFor(node) : undefined,
        campusId: filters.campusId || selectedCampus.id,
        ratingMin: filters.ratingMin || undefined,
        priceBucket: filters.priceBucket || undefined,
        locationType: filters.locationType || undefined,
        sort: filters.sort,
        page,
        pageSize: PAGE_SIZE,
      })
        .then((result) => {
          if (cancelled) return;
          setServices(result.items);
          setResultCount(result.total);
          setTotalPages(result.totalPages);
          setCurrentPage(result.page);
          setError(null);
        })
        .catch(() => {
          if (cancelled) return;
          setServices([]);
          setResultCount(0);
          setError("We couldn't load services right now.");
        })
        .finally(() => {
          if (!cancelled) setIsLoading(false);
        });
    }, 200);
    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [categoryTree, debouncedQ, filters.categoryId, filters.campusId, filters.ratingMin, filters.priceBucket, filters.locationType, filters.sort, page, selectedCampus.id, attempt]);

  const setFilter = useCallback(
    <K extends keyof ServiceMarketplaceFilters>(key: K, value: ServiceMarketplaceFilters[K]) => {
      if (key === "categoryId" && lockedCategoryId) return;
      const next = { ...filters, [key]: value };
      setFilters(next);
      const nextPage = key === "sort" ? page : 1;
      setPage(nextPage);
      router.replace(buildSearchUrl(next, nextPage, basePath, lockedCategoryId), { scroll: false });
    },
    [filters, page, router, basePath, lockedCategoryId]
  );

  const setPageAndSync = useCallback(
    (p: number) => {
      setPage(p);
      router.replace(buildSearchUrl(filters, p, basePath, lockedCategoryId), { scroll: false });
    },
    [filters, router, basePath, lockedCategoryId]
  );

  const clearFilters = useCallback(() => {
    const reset: ServiceMarketplaceFilters = { ...defaultServiceFilters };
    if (lockedCategoryId) reset.categoryId = lockedCategoryId;
    setFilters(reset);
    setPage(1);
    router.replace(buildSearchUrl(reset, 1, basePath, lockedCategoryId), { scroll: false });
  }, [router, basePath, lockedCategoryId]);

  const effectiveCampusId = filters.campusId || selectedCampus.id;

  return {
    filters,
    page,
    setFilter,
    setPage: setPageAndSync,
    clearFilters,
    isLoading,
    error,
    retry: () => setAttempt((n) => n + 1),
    services,
    resultCount,
    totalPages,
    currentPage,
    categories,
    campusOptions,
    effectiveCampusId,
  };
}