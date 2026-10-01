"use client";

import { keepPreviousData, useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { nearbyKeys } from "@/lib/query-keys";
import {
  fetchNearby,
  fetchNearbyTypes,
  roundCoordinate,
  type NearbyParams,
} from "@/services/nearby-api";

/**
 * Nearby results for an explicit origin. Deliberately NOT tied to map movement:
 * the query only changes when the origin, radius, type, category, campus,
 * date range, sort or search text change.
 */
export function useNearby(params: Omit<NearbyParams, "page"> | null) {
  const { status } = useAuth();
  return useInfiniteQuery({
    queryKey: nearbyKeys.search({
      lat: params ? roundCoordinate(params.latitude) : 0,
      lng: params ? roundCoordinate(params.longitude) : 0,
      radius: params?.radiusMeters ?? 0,
      bounds: params?.bounds,
      type: params?.entityType ?? "",
      category: params?.categoryId ?? "",
      campus: params?.campusId ? `${params.campusId}:${params.campusScope ?? "WITHIN"}` : "",
      date: params?.dateFrom || params?.dateTo ? `${params.dateFrom ?? ""}:${params.dateTo ?? ""}` : "",
      sort: params?.sort ?? "nearest",
      q: params?.q?.trim() ?? "",
    }),
    enabled: status === "authenticated" && params !== null,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    placeholderData: keepPreviousData,
    initialPageParam: 1,
    queryFn: ({ pageParam, signal }) =>
      fetchNearby({ ...(params as Omit<NearbyParams, "page">), page: pageParam }, signal),
    getNextPageParam: (last) => (last.meta.hasNextPage ? last.meta.page + 1 : undefined),
  });
}

export function useNearbyTypes() {
  const { status } = useAuth();
  return useQuery({
    queryKey: nearbyKeys.types,
    enabled: status === "authenticated",
    staleTime: 60 * 60_000,
    queryFn: fetchNearbyTypes,
  });
}
