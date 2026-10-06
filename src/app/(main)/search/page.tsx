"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PageContainer } from "@/components/layout";
import {
  RecentSearches,
  SearchCategoryBrowse,
  SearchEmptyState,
  SearchErrorState,
  SearchFilterPanel,
  SearchFilters,
  SearchInput,
  SearchResults,
  SearchResultsSkeleton,
  TrendingSearches,
} from "@/components/search";
import { Pagination } from "@/components/marketplace/listing/Pagination";
import { useGlobalSearch } from "@/hooks/use-search";
import { getFriendlyErrorMessage } from "@/lib/error-messages";
import {
  addRecentSearch,
  clearRecentSearches,
  getRecentSearches,
  getTrendingSearches,
  removeRecentSearch,
} from "@/services/search";
import {
  SEARCH_PAGE_SIZE,
  SEARCH_DEBOUNCE_MS,
} from "@/config/search";
import type { SearchFilterType, SearchSortOption } from "@/types";

const VALID_TYPES: SearchFilterType[] = [
  "all",
  "product",
  "vendor",
  "category",
  "post",
  "event",
  "job",
  "service",
  "provider",
];
const VALID_SORTS: SearchSortOption[] = [
  "relevance",
  "recent",
  "popular",
  "price_low",
  "price_high",
];
const VALID_TYPES_SET = new Set<SearchFilterType>(VALID_TYPES);
const VALID_SORTS_SET = new Set<SearchSortOption>(VALID_SORTS);

function parsePositiveInt(value: string | null): number | undefined {
  if (value === null) return undefined;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed >= 1 ? parsed : undefined;
}

function parseNonNegative(value: string | null): number | undefined {
  if (value === null) return undefined;
  if (value.trim() === "") return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
}

function SearchPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const firstRender = useRef(true);

  const urlQuery = (searchParams.get("q") ?? "").trim();
  const urlType = searchParams.get("type") ?? "all";
  const urlSort = searchParams.get("sort") ?? "relevance";
  const urlPage = parsePositiveInt(searchParams.get("page")) ?? 1;
  const urlCampus = searchParams.get("campus") ?? "";
  const urlPriceMin = parseNonNegative(searchParams.get("priceMin"));
  const urlPriceMax = parseNonNegative(searchParams.get("priceMax"));

  const typeFilter: SearchFilterType = VALID_TYPES_SET.has(urlType as SearchFilterType)
    ? (urlType as SearchFilterType)
    : "all";
  const sortBy: SearchSortOption = VALID_SORTS_SET.has(urlSort as SearchSortOption)
    ? (urlSort as SearchSortOption)
    : "relevance";

  const [query, setQuery] = useState(urlQuery);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [trending] = useState(getTrendingSearches());

  const latestParamsRef = useRef(searchParams.toString());
  useEffect(() => {
    latestParamsRef.current = searchParams.toString();
  }, [searchParams]);

  useEffect(() => {
    setRecentSearches(getRecentSearches());
  }, []);

  /**
   * Sync the local query to the URL (debounced per SEARCH_DEBOUNCE_MS).
   * The URL is the source of truth for the search — back/forward restores
   * state while the input keeps typing without spamming history (replace).
   * Encode on top of the LATEST params so a filter change made mid-debounce
   * is never clobbered.
   */
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    const trimmed = query.trim();
    if (trimmed === urlQuery) return;
    const timer = setTimeout(() => {
      const params = new URLSearchParams(latestParamsRef.current);
      if (trimmed) params.set("q", trimmed);
      else params.delete("q");
      const qs = params.toString();
      router.replace(qs ? `/search?${qs}` : "/search", { scroll: false });
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  /**
   * Browser back/forward: URL changed externally — restore the input and let
   * the derived states re-render from the new params.
   */
  useEffect(() => {
    if (urlQuery !== query.trim()) {
      setQuery(urlQuery);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  function buildParams(patch: {
    q?: string | null;
    type?: SearchFilterType;
    sort?: SearchSortOption;
    page?: number;
    campus?: string;
    priceMin?: number | undefined;
    priceMax?: number | undefined;
  }): string {
    const params = new URLSearchParams();
    const q = patch.q ?? urlQuery;
    const type = patch.type ?? typeFilter;
    const sort = patch.sort ?? sortBy;
    const page = patch.page ?? urlPage;
    const campus = patch.campus ?? urlCampus;
    const priceMin = "priceMin" in patch ? patch.priceMin : urlPriceMin;
    const priceMax = "priceMax" in patch ? patch.priceMax : urlPriceMax;
    if (q) params.set("q", q);
    if (type && type !== "all") params.set("type", type);
    if (sort && sort !== "relevance") params.set("sort", sort);
    if (page > 1) params.set("page", String(page));
    if (campus) params.set("campus", campus);
    if (priceMin !== undefined) params.set("priceMin", String(priceMin));
    if (priceMax !== undefined) params.set("priceMax", String(priceMax));
    const qs = params.toString();
    return qs ? `/search?${qs}` : "/search";
  }

  const replaceParams = (patch: Parameters<typeof buildParams>[0]) => {
    router.replace(buildParams(patch), { scroll: false });
  };

  const page = urlPage;
  const resultsQuery = useMemo(
    () => ({
      q: urlQuery,
      type: typeFilter,
      sort: sortBy,
      campusId: urlCampus || undefined,
      priceMin: urlPriceMin,
      priceMax: urlPriceMax,
      page,
      pageSize: SEARCH_PAGE_SIZE,
    }),
    [urlQuery, typeFilter, sortBy, urlCampus, urlPriceMin, urlPriceMax, page]
  );

  const {
    data,
    isPending,
    isFetching,
    isError,
    error,
    refetch,
  } = useGlobalSearch(resultsQuery);

  const hasQuery = urlQuery.length > 0;
  const hasActiveFilters =
    typeFilter !== "all" || !!urlCampus || urlPriceMin !== undefined || urlPriceMax !== undefined;

  const handleTypeChange = (t: SearchFilterType) =>
    replaceParams({ type: t, page: 1 });

  const handleSortChange = (s: SearchSortOption) =>
    replaceParams({ sort: s, page: 1 });

  const handleCampusChange = (campusId: string) =>
    replaceParams({ campus: campusId, page: 1 });

  const handlePriceMinChange = (value?: number) =>
    replaceParams({ priceMin: value, page: 1 });

  const handlePriceMaxChange = (value?: number) =>
    replaceParams({ priceMax: value, page: 1 });

  const handleClearFilters = () =>
    replaceParams({ type: "all", sort: "relevance", campus: "", priceMin: undefined, priceMax: undefined, page: 1 });

  const handleSubmit = (q?: string) => {
    const trimmed = (q ?? query).trim();
    if (!trimmed) return;
    setQuery(trimmed);
    if (trimmed !== urlQuery) {
      addRecentSearch(trimmed);
      setRecentSearches(getRecentSearches());
      replaceParams({ q: trimmed, page: 1 });
    }
  };

  const handleRecentSelect = (q: string) => handleSubmit(q);

  const filterPanelProps = {
    campusId: urlCampus,
    priceMin: urlPriceMin,
    priceMax: urlPriceMax,
    onCampusChange: handleCampusChange,
    onPriceMinChange: handlePriceMinChange,
    onPriceMaxChange: handlePriceMaxChange,
    onClear: handleClearFilters,
  };

  const totalPages = data?.totalPages ?? 1;

  return (
    <PageContainer className="space-y-5">
      <SearchInput
        value={query}
        onValueChange={(v) => setQuery(v)}
        onSubmit={handleSubmit}
        autoFocus={!hasQuery}
      />

      {!hasQuery && !isPending ? (
        <div className="space-y-6">
          <p className="text-sm text-neutral-500 -mt-2">
            Search across products, services, providers, jobs, events, vendors and more.
          </p>
          <RecentSearches
            searches={recentSearches}
            onSelect={handleRecentSelect}
            onRemove={(q) => {
              removeRecentSearch(q);
              setRecentSearches(getRecentSearches());
            }}
            onClear={() => {
              clearRecentSearches();
              setRecentSearches([]);
            }}
          />
          <TrendingSearches trending={trending} onSelect={handleRecentSelect} />
          <SearchCategoryBrowse />
        </div>
      ) : (
        <div className="space-y-4">
          <SearchFilters
            {...filterPanelProps}
            activeType={typeFilter}
            sortBy={sortBy}
            resultCount={data?.total}
            onTypeChange={handleTypeChange}
            onSortChange={handleSortChange}
          />

          <div className="lg:grid lg:grid-cols-[220px_1fr] lg:items-start lg:gap-6">
<aside className="hidden lg:block">
                <div className="lg:sticky lg:top-20">
                  <SearchFilterPanel {...filterPanelProps} idPrefix="search-filters-sidebar" />
                </div>
              </aside>

            <div className="min-w-0 space-y-6">
              {isError ? (
                <SearchErrorState
                  message={getFriendlyErrorMessage(error)}
                  onRetry={() => refetch()}
                />
              ) : isPending ? (
                <SearchResultsSkeleton />
              ) : data && data.total > 0 ? (
                <>
                  {data.unavailable && data.unavailable.length > 0 && (
                    <p
                      role="status"
                      className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800"
                    >
                      Some results couldn&apos;t be loaded ({data.unavailable.join(", ")}). Try again in a moment.
                    </p>
                  )}
                  <SearchResults
                    items={data.items}
                    query={data.query}
                  />
                  {isFetching && (
                    <p className="text-center text-xs text-neutral-400">
                      Updating results…
                    </p>
                  )}
                  <Pagination
                    currentPage={page}
                    totalPages={totalPages}
                    onPageChange={(p) => replaceParams({ page: p })}
                  />
                </>
              ) : (
                <SearchEmptyState
                  query={urlQuery}
                  hasActiveFilters={hasActiveFilters}
                  onClearFilters={handleClearFilters}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </PageContainer>
  );
}

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <PageContainer className="py-16 text-center">
          <div className="h-8 w-8 border-3 border-kampmax-blue/20 border-t-kampmax-blue rounded-full animate-spin mx-auto" />
        </PageContainer>
      }
    >
      <SearchPageInner />
    </Suspense>
  );
}