import { FREELANCER_SERVICE_PRICING_LABEL } from "@/config/freelancer-services";
import type { PublicServiceSort } from "@/services/freelancer-services";
import type { FreelancerServicePricing } from "@/types/freelancer-services";

/** What the browse page is currently showing; all of it lives in the URL. */
export interface BrowseFilters {
  q: string;
  /** Category slug or id. */
  category: string;
  pricing: FreelancerServicePricing | "";
  sort: PublicServiceSort;
  page: number;
}

export const SORTS: { value: PublicServiceSort; label: string }[] = [
  { value: "newest", label: "Newest" },
  { value: "price_asc", label: "Price: low to high" },
  { value: "price_desc", label: "Price: high to low" },
];

export const PRICING_FILTERS = Object.entries(FREELANCER_SERVICE_PRICING_LABEL) as [
  FreelancerServicePricing,
  string,
][];

type SearchParams = { [key: string]: string | string[] | undefined };

function first(v: string | string[] | undefined): string {
  return (Array.isArray(v) ? v[0] : v) ?? "";
}

/** Reads the URL's query into filters, ignoring anything that isn't a known value. */
export function parseFilters(sp: SearchParams): BrowseFilters {
  const sort = first(sp.sort);
  const pricing = first(sp.pricing);
  return {
    q: first(sp.q).trim().slice(0, 100),
    category: first(sp.category),
    pricing: PRICING_FILTERS.some(([value]) => value === pricing) ? (pricing as FreelancerServicePricing) : "",
    sort: SORTS.some((s) => s.value === sort) ? (sort as PublicServiceSort) : "newest",
    page: Math.max(1, Number.parseInt(first(sp.page), 10) || 1),
  };
}

/** A link to the browse page with some filters changed. Changing a filter goes back to page 1. */
export function browseHref(current: BrowseFilters, change: Partial<BrowseFilters> = {}): string {
  const next = { ...current, page: 1, ...change };
  const params = new URLSearchParams();
  if (next.q) params.set("q", next.q);
  if (next.category) params.set("category", next.category);
  if (next.pricing) params.set("pricing", next.pricing);
  if (next.sort !== "newest") params.set("sort", next.sort);
  if (next.page > 1) params.set("page", String(next.page));
  const qs = params.toString();
  return `/freelancers/services${qs ? `?${qs}` : ""}`;
}
