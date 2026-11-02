"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { searchKeys } from "@/lib/query-keys";
import { getSuggestions, search } from "@/services/search";
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
  const trimmedQuery = (query.q ?? "").trim();
  // Every source is public (guests browse them on the home page and in Explore), so
  // search needs no account. Gating it on sign-in left a guest on a loading screen forever.
  const enabled = trimmedQuery.length > 0;

  return useQuery({
    queryKey: searchKeys.results(query),
    enabled,
    placeholderData: keepPreviousData,
    staleTime: 30_000,
    queryFn: (): Promise<SearchPage> =>
      search(trimmedQuery, {
        type: query.type,
        sort: query.sort,
        campusId: query.campusId,
        priceMin: query.priceMin,
        priceMax: query.priceMax,
        page: query.page ?? 1,
        pageSize: query.pageSize ?? SEARCH_PAGE_SIZE,
      }),
  });
}

/**
 * Type-ahead suggestions for the global search box. Only fires once the
 * query is ≥2 characters. The backend has no suggestion endpoint, so these are
 * the top live matches from a few verticals; this hook is where a real
 * `GET /search/suggestions` will plug in.
 */
export function useSearchSuggestions(q: string) {
  const trimmed = q.trim();
  const enabled = trimmed.length >= SEARCH_SUGGESTIONS_MIN_CHARS;

  return useQuery({
    queryKey: searchKeys.suggestions(trimmed),
    enabled,
    staleTime: 30_000,
    queryFn: (): Promise<SearchSuggestion[]> => getSuggestions(trimmed),
  });
}
