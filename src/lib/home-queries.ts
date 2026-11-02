import type { QueryClient } from "@tanstack/react-query";
import { fetchProducts } from "@/services/products";
import { fetchCategories } from "@/services/categories";
import { fetchVendors } from "@/services/users";
import { listPublicServices } from "@/services/service-marketplace";
import { listPublicJobs } from "@/services/jobs";
import { fetchPublicServices } from "@/services/freelancer-services";
import { eventsListQuery } from "@/services/event-queries";
import { jobToOpportunity } from "@/lib/job-api-mapping";

/**
 * The home page's data, as plain query definitions (cache key + how to fetch).
 *
 * This is a plain module, not a "use client" hook file, so a server page can prefetch
 * exactly the queries the client hooks in `hooks/use-home.ts` will ask for: both read
 * the same definitions, so the keys always match and the page can start with data
 * already in it.
 */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Only real (UUID) campus ids can be sent to the API. */
export function toApiCampusId(campusId: string | undefined): string | undefined {
  return campusId && UUID_RE.test(campusId) ? campusId : undefined;
}

export const homeKeys = {
  all: ["home"] as const,
  products: (campusId?: string) => ["home", "products", campusId ?? "all"] as const,
  services: (campusId?: string) => ["home", "services", campusId ?? "all"] as const,
  gigs: (campusId?: string) => ["home", "gigs", campusId ?? "all"] as const,
  freelance: ["home", "freelance"] as const,
  categories: ["home", "categories"] as const,
  vendors: (campusId?: string) => ["home", "vendors", campusId ?? "all"] as const,
  featured: (placement: string, campusId?: string, categoryId?: string) =>
    ["home", "featured", placement, campusId ?? "all", categoryId ?? "all"] as const,
};

/**
 * The service `fetch*` helpers fall back to seeded mock data on failure.
 * The home feed must only ever show live data, so a failed request is
 * surfaced as a query error instead.
 */
function live<T>(res: { data: T; error: unknown }): T {
  if (res.error) throw res.error instanceof Error ? res.error : new Error("Request failed");
  return res.data;
}

export const homeQueries = {
  products: (campusId?: string) => {
    const apiCampusId = toApiCampusId(campusId);
    return {
      queryKey: homeKeys.products(apiCampusId),
      queryFn: async () =>
        live(await fetchProducts({ campusId: apiCampusId, status: "ACTIVE", limit: 40 })),
    };
  },

  services: (campusId?: string) => {
    const apiCampusId = toApiCampusId(campusId);
    return {
      queryKey: homeKeys.services(apiCampusId),
      // Live catalogue only: an outage is an error, never demo services.
      queryFn: () => listPublicServices({ campusId: apiCampusId, limit: 8 }),
    };
  },

  /** The newest live freelancer services. Not campus-specific: freelancers work remotely. */
  freelance: () => ({
    queryKey: homeKeys.freelance,
    queryFn: async () => {
      const page = await fetchPublicServices({ limit: 4 });
      if (page.failed) throw new Error("Couldn't load freelancer services.");
      return page.items;
    },
  }),

  /** Newest published gigs (public, no sign-in needed). */
  gigs: (campusId?: string) => {
    const apiCampusId = toApiCampusId(campusId);
    return {
      queryKey: homeKeys.gigs(apiCampusId),
      queryFn: async () => {
        const { jobs, error } = await listPublicJobs({ campusId: apiCampusId, sort: "newest", limit: 4 });
        if (error) throw error;
        return jobs.map(jobToOpportunity);
      },
    };
  },

  categories: () => ({
    queryKey: homeKeys.categories,
    queryFn: async () => live(await fetchCategories({ limit: 20 })),
  }),

  vendors: (campusId?: string) => {
    const apiCampusId = toApiCampusId(campusId);
    return {
      queryKey: homeKeys.vendors(apiCampusId),
      queryFn: async () => live(await fetchVendors({ campusId: apiCampusId, limit: 10 })),
    };
  },

  events: (campusId?: string) => eventsListQuery({ campusId: campusId || undefined, limit: 10 }),
};

/**
 * Loads the home page's public data into `queryClient` ahead of the first render, so a
 * visitor (or a search engine) gets real content in the first HTML instead of an empty
 * page. Starts from the "all campuses" view: the visitor's campus isn't known until the
 * browser reads it, and the page switches to it afterwards.
 *
 * Never throws, and never waits longer than `timeoutMs`: a slow or failing source is
 * simply left out, and the browser fetches it as it did before.
 */
export async function prefetchHome(queryClient: QueryClient, timeoutMs = 1500): Promise<void> {
  const loading = Promise.allSettled([
    queryClient.prefetchQuery(homeQueries.products()),
    queryClient.prefetchQuery(homeQueries.services()),
    queryClient.prefetchQuery(homeQueries.freelance()),
    queryClient.prefetchQuery(homeQueries.gigs()),
    queryClient.prefetchQuery(homeQueries.categories()),
    queryClient.prefetchQuery(homeQueries.vendors()),
    queryClient.prefetchQuery(homeQueries.events()),
  ]);

  let timer: ReturnType<typeof setTimeout> | undefined;
  const timedOut = new Promise<void>((resolve) => {
    timer = setTimeout(resolve, timeoutMs);
  });
  await Promise.race([loading, timedOut]);
  clearTimeout(timer);
}
