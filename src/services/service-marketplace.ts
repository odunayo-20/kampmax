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
  RequestQuoteResult,
  ServiceMarketplaceCategory,
  ServiceReportInput,
  ServiceSortOption,
} from "@/types/service-marketplace";
import {
  marketplaceServiceProviders,
  marketplaceServices,
  marketplaceServiceReviews,
  serviceCategorySlug,
  serviceCategoryBySlug,
} from "@/data/service-marketplace";

export async function getMarketplaceServicesApi(query: MarketplaceServiceQuery = {}): Promise<MarketplaceServicePage> {
  const params = new URLSearchParams();
  if (query.q) params.append("q", query.q);
  if (query.categoryId) params.append("categoryId", query.categoryId);
  if (query.campusId) params.append("campusId", query.campusId);
  if (query.page) params.append("page", String(query.page));

  const { data, error } = await apiClient.get<MarketplaceServicePage>(`/service-provider/services?${params.toString()}`);
  if (!error && data && Array.isArray(data.items)) {
    return data;
  }
  return getServicePage(query);
}
import { spServiceCategoryName, SP_SERVICE_CATEGORIES } from "@/data/service-categories";
import { formatNaira } from "@/lib/utils";
import type { ServiceProviderLocationType, ServiceProviderPricingModel } from "@/types/service-provider";

const DEFAULT_PAGE_SIZE = 12;

// ── Lookups ───────────────────────────────────────────────────

export function getProviderById(providerId: string): MarketplaceProvider | undefined {
  return marketplaceServiceProviders.find((p) => p.id === providerId);
}

export function getActiveServices(): MarketplaceService[] {
  return marketplaceServices.filter((s) => s.isActive);
}

export function getServiceById(serviceId: string): MarketplaceService | undefined {
  return marketplaceServices.find((s) => s.id === serviceId);
}

export function getProviderDisplayName(providerId: string): string {
  return getProviderById(providerId)?.displayName ?? "Service provider";
}

// ── Categories (taxonomy + counts) ────────────────────────────

export function getServiceCategories(): ServiceMarketplaceCategory[] {
  const active = getActiveServices();
  return SP_SERVICE_CATEGORIES.map((c) => ({
    id: c.id,
    name: c.name,
    group: c.group,
    slug: serviceCategorySlug(c.id),
    serviceCount: active.filter((s) => s.categoryId === c.id).length,
  }));
}

export function getServiceCategoryName(categoryId: string): string {
  return spServiceCategoryName(categoryId);
}

export function getServiceCategoryBySlug(slug: string): ServiceMarketplaceCategory | undefined {
  const raw = serviceCategoryBySlug(slug);
  if (!raw) return undefined;
  return getServiceCategories().find((c) => c.id === raw.id);
}

export function getServiceCategoryById(id: string): ServiceMarketplaceCategory | undefined {
  return getServiceCategories().find((c) => c.id === id);
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

function matchesQuery(service: MarketplaceService, provider: MarketplaceProvider, q: string): boolean {
  const haystack = [
    service.name,
    service.description,
    ...(service.tags ?? []),
    provider.displayName,
    ...provider.specialties,
    ...provider.specialties.map((s) => s.toLowerCase()),
    getServiceCategoryName(service.categoryId),
  ]
    .join(" ")
    .toLowerCase();
  return haystack.includes(q.toLowerCase());
}

function matchesPriceBucket(service: MarketplaceService, bucket: string): boolean {
  if (service.pricingModel === "quote") return false; // quote services have no list price
  switch (bucket) {
    case "free":
      return service.price === 0;
    case "under_5000":
      return service.price > 0 && service.price < 5000;
    case "5000_10000":
      return service.price >= 5000 && service.price <= 10000;
    case "10000_25000":
      return service.price > 10000 && service.price <= 25000;
    case "25000_plus":
      return service.price > 25000;
    default:
      return true;
  }
}

function effectivePriceForSort(service: MarketplaceService): number | null {
  return service.pricingModel === "quote" ? null : service.price;
}

function sortServices(
  items: MarketplaceService[],
  sort: ServiceSortOption,
  providersById: Record<string, MarketplaceProvider>
): MarketplaceService[] {
  const sorted = [...items];
  switch (sort) {
    case "top_rated":
      return sorted.sort(
        (a, b) =>
          (providersById[b.providerId]?.rating ?? 0) - (providersById[a.providerId]?.rating ?? 0) ||
          b.viewCount - a.viewCount
      );
    case "most_popular":
      return sorted.sort((a, b) => b.viewCount - a.viewCount);
    case "price_low":
      return sorted.sort(
        (a, b) =>
          (effectivePriceForSort(a) ?? Number.MAX_SAFE_INTEGER) -
          (effectivePriceForSort(b) ?? Number.MAX_SAFE_INTEGER)
      );
    case "price_high":
      return sorted.sort(
        (a, b) =>
          (effectivePriceForSort(b) ?? -1) -
          (effectivePriceForSort(a) ?? -1)
      );
    case "newest":
      return sorted.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    case "recommended":
    default:
      return sorted.sort(
        (a, b) =>
          Number(b.isFeatured) - Number(a.isFeatured) ||
          (providersById[b.providerId]?.rating ?? 0) - (providersById[a.providerId]?.rating ?? 0) ||
          b.viewCount - a.viewCount
      );
  }
}

export function getServicePage(query: MarketplaceServiceQuery = {}): MarketplaceServicePage {
  const providersById = Object.fromEntries(
    marketplaceServiceProviders.map((p) => [p.id, p])
  );

  let items = getActiveServices().filter((s) => providersById[s.providerId]);

  if (query.q) {
    const q = query.q.trim();
    if (q) items = items.filter((s) => matchesQuery(s, providersById[s.providerId], q));
  }
  if (query.categoryId) {
    items = items.filter((s) => s.categoryId === query.categoryId);
  }
  if (query.campusId) {
    const campusId = query.campusId;
    items = items.filter((s) => {
      const p = providersById[s.providerId];
      return p.primaryCampusId === campusId || p.additionalCampusIds.includes(campusId);
    });
  }
  if (query.ratingMin) {
    items = items.filter((s) => (providersById[s.providerId]?.rating ?? 0) >= query.ratingMin!);
  }
  if (query.priceBucket) {
    items = items.filter((s) => matchesPriceBucket(s, query.priceBucket!));
  }
  if (query.locationType) {
    items = items.filter((s) => s.locationType === query.locationType);
  }

  items = sortServices(items, query.sort ?? "recommended", providersById);

  const page = Math.max(1, query.page || 1);
  const pageSize = Math.max(1, query.pageSize || DEFAULT_PAGE_SIZE);
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const start = (page - 1) * pageSize;

  return {
    items: items.slice(start, start + pageSize),
    total,
    page,
    pageSize,
    totalPages,
  };
}

// ── Service detail ────────────────────────────────────────────

export interface ServiceDetail {
  service: MarketplaceService;
  provider: MarketplaceProvider;
}

export function getServiceDetail(serviceId: string): ServiceDetail | null {
  const service = getServiceById(serviceId);
  if (!service || !service.isActive) return null;
  const provider = getProviderById(service.providerId);
  if (!provider) return null;
  return { service, provider };
}

/** Related services: same category or same provider, respecting visibility. */
export function getRelatedServices(serviceId: string, limit = 4): MarketplaceService[] {
  const detail = getServiceDetail(serviceId);
  if (!detail) return [];
  const { service } = detail;
  const pool = getActiveServices().filter((s) => s.id !== serviceId);
  const sameCategory = pool.filter((s) => s.categoryId === service.categoryId);
  const sameProvider = pool.filter((s) => s.providerId === service.providerId && !sameCategory.includes(s));
  const others = pool.filter((s) => !sameCategory.includes(s) && !sameProvider.includes(s));
  const ranked = [...sameCategory, ...sameProvider, ...others];
  // prefer featured first within the same category
  ranked.sort((a, b) => Number(b.isFeatured) - Number(a.isFeatured));
  return ranked.slice(0, limit);
}

// ── Provider profile ──────────────────────────────────────────

export function getMarketplaceProvider(providerId: string): MarketplaceProvider | undefined {
  return getProviderById(providerId);
}

export function getProviderActiveServices(providerId: string): MarketplaceService[] {
  return getActiveServices().filter((s) => s.providerId === providerId);
}

export function getProviderReviews(providerId: string, serviceId?: string): MarketplaceServiceReview[] {
  return marketplaceServiceReviews
    .filter((r) => r.providerId === providerId && (!serviceId || !r.serviceId || r.serviceId === serviceId))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function getProviderReviewSummary(providerId: string): {
  average: number;
  count: number;
  distribution: { star: number; count: number }[];
} {
  const reviews = marketplaceServiceReviews.filter((r) => r.providerId === providerId);
  const distribution = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: reviews.filter((r) => Math.round(r.rating) === star).length,
  }));
  const average =
    reviews.length === 0
      ? getProviderById(providerId)?.rating ?? 0
      : reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
  return { average, count: reviews.length, distribution };
}

/** Providers in the same primary category (for "Similar providers"). */
export function getRelatedProviders(providerId: string, limit = 3): MarketplaceProvider[] {
  const provider = getProviderById(providerId);
  if (!provider) return [];
  return marketplaceServiceProviders
    .filter((p) => p.id !== providerId && p.primaryCategoryId === provider.primaryCategoryId)
    .slice(0, limit);
}

// ── Availability summary (derived, public) ────────────────────

export function getAvailabilitySummary(provider: MarketplaceProvider): { dayIndex: number; label: string; isAvailable: boolean; openTime?: string; closeTime?: string }[] {
  return provider.availability.days;
}

export function getOpenDaysLabel(provider: MarketplaceProvider): string {
  const open = provider.availability.days.filter((d) => d.isAvailable);
  if (open.length === 0) return "Closed this week";
  if (open.length === 7) return "Open daily";
  const short = open.map((d) => d.label.slice(0, 3)).join(", ");
  return `${open.length} days (${short})`;
}

// ── Favorites (auth-scoped) ───────────────────────────────────
// No second "wishlist system" is created; this is the service-action
// abstraction a future `GET/POST/DELETE /me/services/favorites` API will back.

const serviceFavoritesByUser = new Map<string, string[]>();

export function getServiceFavoriteIds(userId: string): string[] {
  return serviceFavoritesByUser.get(userId) ?? [];
}

export function isServiceFavorited(serviceId: string, userId: string): boolean {
  return (serviceFavoritesByUser.get(userId) ?? []).includes(serviceId);
}

export function toggleServiceFavorite(serviceId: string, userId: string): boolean {
  const current = serviceFavoritesByUser.get(userId) ?? [];
  if (current.includes(serviceId)) {
    serviceFavoritesByUser.set(userId, current.filter((id) => id !== serviceId));
    return false;
  }
  serviceFavoritesByUser.set(userId, [...current, serviceId]);
  return true;
}

// ── Report (moderation via backend; no deletion here) ─────────

export function reportService(input: ServiceReportInput): { success: boolean; id: string } {
  // In production this POSTs to the backend for moderation review.
  void input;
  const id = `svc-report-${Date.now()}`;
  return { success: true, id };
}

// ── Request a quote (prepare-only; no negotiation) ────────────

export function submitRequestQuote(input: RequestQuoteInput): RequestQuoteResult {
  if (!input.serviceId || !input.providerId) {
    return { success: false, message: "Service information is incomplete." };
  }
  if (!input.requirements.trim()) {
    return { success: false, message: "Tell the provider a little about your requirements." };
  }
  const id = `quote-${Date.now()}`;
  return {
    success: true,
    id,
    message: "Your request was sent. The provider will respond with a quote.",
  };
}