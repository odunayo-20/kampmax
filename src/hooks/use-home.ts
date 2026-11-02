"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { fetchFeaturedPromotions, type FeaturedPlacement } from "@/services/featured-promotions";
import { homeKeys, homeQueries, toApiCampusId } from "@/lib/home-queries";

// The queries themselves live in `lib/home-queries` so the server can prefetch the same
// ones. These hooks add the browser-side behaviour.
export { homeKeys, toApiCampusId };

/**
 * Switching campus asks for a new list. `keepPreviousData` leaves the old campus's list
 * on screen until the new one arrives, instead of dropping every section back to a
 * loading placeholder.
 */
const keepWhileSwitching = { placeholderData: keepPreviousData } as const;

export function useHomeProducts(campusId?: string) {
  return useQuery({ ...homeQueries.products(campusId), ...keepWhileSwitching });
}

export function useHomeServices(campusId?: string) {
  return useQuery({ ...homeQueries.services(campusId), ...keepWhileSwitching });
}

export function useHomeFreelanceServices() {
  return useQuery(homeQueries.freelance());
}

export function useHomeGigs(campusId?: string) {
  return useQuery({ ...homeQueries.gigs(campusId), ...keepWhileSwitching });
}

export function useHomeCategories() {
  return useQuery(homeQueries.categories());
}

export function useHomeVendors(campusId?: string) {
  return useQuery({ ...homeQueries.vendors(campusId), ...keepWhileSwitching });
}

export function useHomeEvents(campusId?: string) {
  return useQuery({
    ...homeQueries.events(campusId),
    select: (page) => page.items,
    ...keepWhileSwitching,
  });
}

/** Promo codes an admin featured in a storefront slot. */
export function useFeaturedPromotions(
  placement: FeaturedPlacement,
  campusId?: string,
  categoryId?: string
) {
  const apiCampusId = toApiCampusId(campusId);
  const apiCategoryId = toApiCampusId(categoryId); // same UUID check
  return useQuery({
    queryKey: homeKeys.featured(placement, apiCampusId, apiCategoryId),
    queryFn: () => fetchFeaturedPromotions(placement, apiCampusId, apiCategoryId),
    staleTime: 60_000,
  });
}
