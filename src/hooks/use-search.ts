"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { searchKeys } from "@/lib/query-keys";
import { getSuggestions, search, SearchFiltersInput } from "@/services/search";
import { fetchProducts } from "@/services/products";
import { fetchVendors } from "@/services/users";
import { fetchCategories } from "@/services/categories";
import type { GlobalSearchQuery, SearchPage, SearchSuggestion } from "@/types";
import {
  SEARCH_PAGE_SIZE,
  SEARCH_SUGGESTIONS_MIN_CHARS,
} from "@/config/search";


/**
 * Unified global-search results (Module 31). Cache key embeds the FULL
 * normalized query (term + type + sort + page + campus + price range) so
 * every unique search carries its own cached page; `keepPreviousData`
 * keeps the last results visible while a new page/term is fetching, and
 * `staleTime` avoids refetching identical searches on quick filter changes.
 */
export function useGlobalSearch(query: GlobalSearchQuery) {
  const { status } = useAuth();
  const trimmedQuery = (query.q ?? "").trim();
  const enabled = status === "authenticated" && trimmedQuery.length > 0;

  return useQuery({
    queryKey: searchKeys.results(query),
    enabled,
    placeholderData: keepPreviousData,
    staleTime: 30_000,
    queryFn: async (): Promise<SearchPage> => {
      // Refresh the live caches the sync search reads from.
      await Promise.all([
        fetchProducts({ search: trimmedQuery, campusId: query.campusId, status: "ACTIVE", limit: 50 }),
        fetchVendors({ search: trimmedQuery, campusId: query.campusId, limit: 20 }),
        fetchCategories({ limit: 50 }),
      ]);
      const filters: SearchFiltersInput = {
        type: query.type,
        sort: query.sort,
        campusId: query.campusId,
        priceMin: query.priceMin,
        priceMax: query.priceMax,
        page: query.page ?? 1,
        pageSize: query.pageSize ?? SEARCH_PAGE_SIZE,
      };
      return search(trimmedQuery, filters);
    },
  });
}

/**
 * Type-ahead suggestions for the global search box. Only fires once the
 * query is ≥2 characters. The current backend has no suggestion endpoint —
 * this runs over the same in-memory stores the mock services read, and the
 * hook boundary is where a real `GET /search/suggestions` will plug in.
 */
export function useSearchSuggestions(q: string) {
  const { status } = useAuth();
  const trimmed = q.trim();
  const enabled =
    status === "authenticated" &&
    trimmed.length >= SEARCH_SUGGESTIONS_MIN_CHARS;

  return useQuery({
    queryKey: searchKeys.suggestions(trimmed),
    enabled,
    queryFn: async (): Promise<SearchSuggestion[]> => {
      await Promise.all([
        fetchProducts({ search: trimmed, status: "ACTIVE", limit: 10 }),
        fetchVendors({ search: trimmed, limit: 5 }),
        fetchCategories({ limit: 50 }),
      ]);
      return getSuggestions(trimmed);
    },
  });
}