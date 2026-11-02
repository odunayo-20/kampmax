import type { MarketplaceFilters } from "@/types";

export const DEFAULT_FILTERS: MarketplaceFilters = {
  search: "",
  categoryId: "",
  campusId: "",
  vendorId: "",
  condition: "",
  minPrice: "",
  maxPrice: "",
  sort: "recent",
};

const SORTS = ["recent", "price_low", "price_high"] as const;
const CONDITIONS = ["New", "Used"] as const;

/**
 * In the address, "every campus" is `campus=all`. No `campus` at all means the visitor's
 * own campus, so a link someone shares doesn't pin the sender's campus on the recipient.
 */
const ALL_CAMPUSES = "all";

type Params = Pick<URLSearchParams, "get">;

/** What an address means. `defaultCampusId` is the visitor's own campus ("" until it's known). */
export function filtersFromParams(params: Params, defaultCampusId: string): MarketplaceFilters {
  const campus = params.get("campus");
  return {
    search: params.get("q") ?? params.get("search") ?? "",
    categoryId: params.get("category") ?? "",
    vendorId: params.get("vendor") ?? "",
    campusId: campus === null ? defaultCampusId : campus === ALL_CAMPUSES ? "" : campus,
    condition: CONDITIONS.find((c) => c.toLowerCase() === params.get("condition")?.toLowerCase()) ?? "",
    minPrice: params.get("minPrice") ?? "",
    maxPrice: params.get("maxPrice") ?? "",
    sort: SORTS.find((s) => s === params.get("sort")) ?? "recent",
  };
}

/** The address for some filters. Only what differs from the defaults is written, in a fixed order. */
export function paramsFromFilters(filters: MarketplaceFilters, defaultCampusId: string): URLSearchParams {
  const params = new URLSearchParams();
  const search = filters.search.trim();
  if (search) params.set("q", search);
  if (filters.categoryId) params.set("category", filters.categoryId);
  if (filters.vendorId) params.set("vendor", filters.vendorId);
  if (filters.campusId !== defaultCampusId) params.set("campus", filters.campusId || ALL_CAMPUSES);
  if (filters.condition) params.set("condition", filters.condition.toLowerCase());
  if (filters.minPrice) params.set("minPrice", filters.minPrice);
  if (filters.maxPrice) params.set("maxPrice", filters.maxPrice);
  if (filters.sort !== DEFAULT_FILTERS.sort) params.set("sort", filters.sort);
  return params;
}

export function sameFilters(a: MarketplaceFilters, b: MarketplaceFilters): boolean {
  return (Object.keys(a) as (keyof MarketplaceFilters)[]).every((key) => a[key] === b[key]);
}
