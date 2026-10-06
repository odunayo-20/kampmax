"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchProducts } from "@/services/products";
import { fetchCategories } from "@/services/categories";
import { fetchVendors } from "@/services/users";
import { fetchFeaturedPromotions, type FeaturedPlacement } from "@/services/featured-promotions";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * The service `fetch*` helpers fall back to seeded mock data on failure.
 * The home feed must only ever show live data, so a failed request is
 * surfaced as a query error instead.
 */
function live<T>(res: { data: T; error: unknown }): T {
  if (res.error) throw res.error instanceof Error ? res.error : new Error("Request failed");
  return res.data;
}

import { listPublicServices } from "@/services/service-marketplace";
import { listPublicJobs } from "@/services/jobs";
import { jobToOpportunity } from "@/lib/job-api-mapping";

export const homeKeys = {
  all: ["home"] as const,
  products: (campusId?: string) => ["home", "products", campusId ?? "all"] as const,
  services: (campusId?: string) => ["home", "services", campusId ?? "all"] as const,
  gigs: (campusId?: string) => ["home", "gigs", campusId ?? "all"] as const,
  categories: ["home", "categories"] as const,
  vendors: (campusId?: string) => ["home", "vendors", campusId ?? "all"] as const,
  featured: (placement: string, campusId?: string, categoryId?: string) =>
    ["home", "featured", placement, campusId ?? "all", categoryId ?? "all"] as const,
};

/** Only real (UUID) campus ids can be sent to the API. */
export function toApiCampusId(campusId: string | undefined): string | undefined {
  return campusId && UUID_RE.test(campusId) ? campusId : undefined;
}

export function useHomeProducts(campusId?: string) {
  const apiCampusId = toApiCampusId(campusId);
  return useQuery({
    queryKey: homeKeys.products(apiCampusId),
    queryFn: async () =>
      live(await fetchProducts({ campusId: apiCampusId, status: "ACTIVE", limit: 40 })),
  });
}

export function useHomeServices(campusId?: string) {
  const apiCampusId = toApiCampusId(campusId);
  return useQuery({
    queryKey: homeKeys.services(apiCampusId),
    // Live catalogue only: an outage is an error, never demo services.
    queryFn: () => listPublicServices({ campusId: apiCampusId, limit: 8 }),
  });
}

/** Newest published gigs (public, no sign-in needed). */
export function useHomeGigs(campusId?: string) {
  const apiCampusId = toApiCampusId(campusId);
  return useQuery({
    queryKey: homeKeys.gigs(apiCampusId),
    queryFn: async () => {
      const { jobs, error } = await listPublicJobs({
        campusId: apiCampusId,
        sort: "newest",
        limit: 4,
      });
      if (error) throw error;
      return jobs.map(jobToOpportunity);
    },
  });
}

export function useHomeCategories() {
  return useQuery({
    queryKey: homeKeys.categories,
    queryFn: async () => live(await fetchCategories({ limit: 20 })),
  });
}

export function useHomeVendors(campusId?: string) {
  const apiCampusId = toApiCampusId(campusId);
  return useQuery({
    queryKey: homeKeys.vendors(apiCampusId),
    queryFn: async () => live(await fetchVendors({ campusId: apiCampusId, limit: 10 })),
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
