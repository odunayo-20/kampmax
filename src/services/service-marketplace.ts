// ============================================================
// CUSTOMER-FACING SERVICE MARKETPLACE SERVICE LAYER
// ============================================================
//
// Isolates ALL service-marketplace access behind a single module that maps 1:1
// to the future public API:
//   GET  /services                     → search + filters + sort + page
//   GET  /services/categories          → taxonomy + counts
//   GET  /services/:id                 → public service detail
//   GET  /services/:id/related         → related services
//   GET  /services/providers/:id       → public provider profile
//   GET  /services/providers/:id/services
//   GET  /services/providers/:id/reviews
//   GET  /me/services/favorites        → favorite service ids
//   POST /me/services/favorites/:id    → favorite / unfavorite
//   POST /services/:id/report          → report for moderation
//   POST /services/:id/request-quote   → request a quote (no negotiation)
//
// PUBLIC-ONLY GUARANTEES:
//   - Only ACTIVE services of AVAILABLE providers are returned.
//   - Only pre-approved, public fields are exposed. Private provider data
//     (dashboard store, documents, addresses, status notes) never appears.
//   - The frontend never computes a final price — pricing display is built
//     exactly from the backend pricing model.
//   - Favorites are keyed by the authenticated user id (never client-asserted
//     ownership); guests get empty favorites and full catalog access.

import { apiClient } from "@/lib/api-client";
import type {
  MarketplaceProvider,
  MarketplaceService,
  MarketplaceServicePage,
  MarketplaceServiceQuery,
  MarketplaceServiceReview,
  RequestQuoteInput,
  ServiceMarketplaceCategory,
  ServiceReportInput,
  ServiceSortOption,
} from "@/types/service-marketplace";
import { subtreeNodes, type TaxonomyNode } from "@/services/taxonomy";

import { spServiceCategoryName, SP_SERVICE_CATEGORIES } from "@/data/service-categories";
import { formatNaira } from "@/lib/utils";
import type { ServiceProviderLocationType, ServiceProviderPricingModel } from "@/types/service-provider";

// ── Lookups ───────────────────────────────────────────────────

/**
 * Live catalogue only (GET /service-provider/services): unlike
 * getMarketplaceServicesApi it never falls back to the bundled demo data, so
 * an outage surfaces as an error instead of fake rows.
 */
export async function listPublicServices(
  query: { q?: string; campusId?: string; limit?: number } = {}
): Promise<MarketplaceService[]> {
  const params = new URLSearchParams();
  if (query.q) params.set("q", query.q);
  if (query.campusId) params.set("campusId", query.campusId);
  if (query.limit) params.set("limit", String(query.limit));
  const qs = params.toString();
  const { data, error } = await apiClient.get<MarketplaceServicePage>(
    `/service-provider/services${qs ? `?${qs}` : ""}`
  );
  if (error) throw error;
  return data?.items ?? [];
}

export interface ProviderSearchHit {
  id: string;
  slug: string;
  displayName: string;
  bio: string | null;
  verified: boolean;
}

/** Verified providers with a live service, by name or bio. Live only: failures throw. */
export async function searchProviders(
  query: { q?: string; limit?: number } = {}
): Promise<ProviderSearchHit[]> {
  const params = new URLSearchParams();
  if (query.q) params.set("q", query.q);
  if (query.limit) params.set("limit", String(query.limit));
  const qs = params.toString();
  const { data, error } = await apiClient.get<{ items: ProviderSearchHit[] }>(
    `/service-provider/providers${qs ? `?${qs}` : ""}`
  );
  if (error) throw error;
  return data?.items ?? [];
}

// ── Categories (taxonomy + counts) ────────────────────────────

const nameSlug = (name: string) =>
  name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

/**
 * Category ids a listing may carry for a SERVICE-taxonomy node: the node's own
 * and its descendants' ids, plus the legacy ids ("cat3") on seeded demo
 * listings whose category name matches one of those nodes.
 */
export function categoryIdsFor(node: TaxonomyNode): string[] {
  const nodes = subtreeNodes(node);
  const ids = new Set(nodes.map((n) => n.id));
  for (const legacy of SP_SERVICE_CATEGORIES) {
    if (nodes.some((n) => n.slug === nameSlug(legacy.name))) ids.add(legacy.id);
  }
  return [...ids];
}

/** Browse categories: the root nodes of the SERVICE taxonomy, with live counts per category id. */
export function getServiceCategories(
  roots: TaxonomyNode[],
  counts: Record<string, number> = {}
): ServiceMarketplaceCategory[] {
  return roots.map((r) => ({
    id: r.id,
    name: r.name,
    group: r.name,
    slug: r.slug,
    serviceCount: categoryIdsFor(r).reduce((n, id) => n + (counts[id] ?? 0), 0),
  }));
}

export function getServiceCategoryName(categoryId: string): string {
  return spServiceCategoryName(categoryId);
}

// ── Pricing & location display (backend-authoritative) ────────

export interface ServicePriceDisplay {
  label: string;
  hint?: string;
}

export function getServicePriceDisplay(
  model: ServiceProviderPricingModel,
  price: number,
  priceMax?: number
): ServicePriceDisplay {
  switch (model) {
    case "starting_from":
      return { label: `From ${formatNaira(price)}`, hint: "Starting price" };
    case "range":
      return {
        label: `${formatNaira(price)} – ${formatNaira(priceMax ?? price)}`,
        hint: "Depends on options",
      };
    case "quote":
      return { label: "Quote required", hint: "Request a quote" };
    case "fixed":
    default:
      return { label: formatNaira(price), hint: "Fixed price" };
  }
}

export const SERVICE_LOCATION_LABELS: Record<string, string> = {
  provider_location: "At provider's location",
  customer_location: "At your location",
  both: "Either location",
  online: "Online only",
  flexible: "Flexible location",
};

export function getServiceLocationLabel(locationType: string): string {
  return SERVICE_LOCATION_LABELS[locationType] ?? locationType;
}

export function getServiceDurationLabel(durationMinutes: number): string {
  if (!durationMinutes || durationMinutes <= 0) return "Duration varies";
  if (durationMinutes < 60) return `${durationMinutes} min`;
  const hours = Math.floor(durationMinutes / 60);
  const mins = durationMinutes % 60;
  return mins ? `${hours}h ${mins}m` : `${hours} hour${hours > 1 ? "s" : ""}`;
}

// ── Search / filters / sort / pagination (the "API" endpoint) ─

// ── Availability summary (derived, public) ────────────────────

export function getOpenDaysLabel(provider: MarketplaceProvider): string {
  const open = provider.availability.days.filter((d) => d.isAvailable);
  if (open.length === 0) return "Closed this week";
  if (open.length === 7) return "Open daily";
  const short = open.map((d) => d.label.slice(0, 3)).join(", ");
  return `${open.length} days (${short})`;
}


// ── Report (moderation via backend; no deletion here) ─────────

/** Sends a report to moderators. Resolves only once it has really been received. */
export async function reportService(input: ServiceReportInput): Promise<{ id: string }> {
  const { data, error } = await apiClient.post<
    { reason: ServiceReportInput["reason"]; details?: string },
    { id: string }
  >(`/service-provider/services/${input.serviceId}/report`, {
    reason: input.reason,
    details: input.details?.trim() || undefined,
  });
  if (error || !data) throw error ?? new Error("Could not send the report.");
  return data;
}

// ── Request a quote ───────────────────────────────────────────
// A quote request is a real message to the provider: the backend opens (or
// reuses) the customer's chat with them and posts what is needed. The provider
// answers with a quote in that conversation. No negotiation, payment or booking.

export interface QuoteRequestResult {
  /** The chat with the provider, where the quote will arrive. */
  conversationId: string;
}

/** Sends the request; resolves only once the provider's chat has the message. */
export async function requestQuote(input: RequestQuoteInput): Promise<QuoteRequestResult> {
  const requirements = input.requirements.trim();
  if (!input.serviceId) throw new Error("Service information is incomplete.");
  if (requirements.length < 5) throw new Error("Tell the provider a little about your requirements.");

  const { data, error } = await apiClient.post<
    { requirements: string; neededBy?: string },
    QuoteRequestResult
  >(`/service-provider/services/${input.serviceId}/quote-request`, {
    requirements: [
      requirements,
      input.location ? `Where: ${input.location}` : "",
      input.message?.trim() ? `More details: ${input.message.trim()}` : "",
    ]
      .filter(Boolean)
      .join("\n"),
    neededBy: input.preferredDate || undefined,
  });
  if (error || !data) throw error ?? new Error("Could not send your request. Please try again.");
  return data;
}

// ── Live catalogue, detail pages and favorites ────────────────

function query(params: Record<string, string | number | undefined>): string {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== "") qs.set(k, String(v));
  }
  const text = qs.toString();
  return text ? `?${text}` : "";
}

/** One page of the public catalogue with filters and sorting. Failures throw. */
export async function fetchServicePage(q: MarketplaceServiceQuery = {}): Promise<MarketplaceServicePage> {
  const { data, error } = await apiClient.get<MarketplaceServicePage>(
    `/service-provider/services${query({
      q: q.q?.trim(),
      categoryId: q.categoryIds?.length ? undefined : q.categoryId,
      categoryIds: q.categoryIds?.join(","),
      campusId: q.campusId,
      priceBucket: q.priceBucket,
      locationType: q.locationType,
      ratingMin: q.ratingMin,
      sort: q.sort,
      page: q.page,
      limit: q.pageSize,
    })}`
  );
  if (error || !data || !Array.isArray(data.items)) throw error ?? new Error("Could not load services.");
  return data;
}

/** Live service counts per category id. */
export async function fetchCategoryCounts(): Promise<Record<string, number>> {
  const { data, error } = await apiClient.get<{ categoryId: string; count: number }[]>(
    "/service-provider/services/category-counts"
  );
  if (error || !data) throw error ?? new Error("Could not load category counts.");
  return Object.fromEntries(data.map((row) => [row.categoryId, row.count]));
}

export interface ProviderReviewSummary {
  average: number;
  count: number;
  distribution: { star: number; count: number }[];
}

export interface ServiceDetail {
  service: MarketplaceService;
  provider: MarketplaceProvider;
  related: MarketplaceService[];
  similarProviders: MarketplaceProvider[];
  reviews: MarketplaceServiceReview[];
  reviewSummary: ProviderReviewSummary;
}

export interface ProviderProfile {
  provider: MarketplaceProvider;
  services: MarketplaceService[];
  reviews: MarketplaceServiceReview[];
  reviewSummary: ProviderReviewSummary;
  relatedProviders: MarketplaceProvider[];
}

/** A live service and everything shown with it; null when it doesn't exist or isn't public. */
export async function fetchServiceDetail(serviceId: string): Promise<ServiceDetail | null> {
  const { data, error } = await apiClient.get<ServiceDetail>(`/service-provider/services/public/${serviceId}`);
  if (data) return data;
  if (error?.status === 404 || error?.status === 400) return null;
  throw error ?? new Error("Could not load this service.");
}

/** A provider's public profile by id or slug; null when it doesn't exist or isn't public. */
export async function fetchProviderProfile(ref: string): Promise<ProviderProfile | null> {
  const { data, error } = await apiClient.get<ProviderProfile>(`/service-provider/providers/${encodeURIComponent(ref)}`);
  if (data) return data;
  if (error?.status === 404) return null;
  throw error ?? new Error("Could not load this provider.");
}

// Saved services use the account's wishlist, so they follow the person across devices.

interface WishlistRow {
  id: string;
  targetType: string;
  targetId: string;
}

async function fetchServiceFavoriteRows(): Promise<WishlistRow[]> {
  const { data, error } = await apiClient.get<{ items: WishlistRow[] }>("/wishlist");
  if (error || !data) throw error ?? new Error("Could not load your saved services.");
  return data.items.filter((i) => i.targetType === "SERVICE_PROVIDER_SERVICE");
}

export async function fetchServiceFavoriteIds(): Promise<string[]> {
  return (await fetchServiceFavoriteRows()).map((r) => r.targetId);
}

/** Saves or un-saves a service and returns whether it is now saved. Failures throw. */
export async function setServiceFavorite(serviceId: string, saved: boolean): Promise<boolean> {
  if (saved) {
    const { error } = await apiClient.post("/wishlist", {
      targetType: "SERVICE_PROVIDER_SERVICE",
      targetId: serviceId,
    });
    if (error && error.status !== 409) throw error;
    return true;
  }
  const row = (await fetchServiceFavoriteRows()).find((r) => r.targetId === serviceId);
  if (row) {
    const { error } = await apiClient.delete(`/wishlist/${row.id}`);
    if (error) throw error;
  }
  return false;
}
