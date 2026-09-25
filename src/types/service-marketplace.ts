// ============================================================
// CUSTOMER-FACING SERVICE MARKETPLACE DOMAIN TYPES
// ============================================================
//
// Public, backend-authoritative projections for the customer-facing service
// marketplace (`/services`). These types are deliberately SEPARATE from the
// provider-owned dashboard types (`@/types/service-provider`):
//
//   - They only carry PUBLIC fields (never banned/suspended/rejected status,
//     moderation notes, private addresses, documents, or internal scores).
//   - "Owner" — an authenticated provider's profile, dashboard store, and
//     private activity — is NEVER mixed into these projections.
//   - Every value shown comes from a "backend" (mock catalog) response; the
//     frontend never decides availability/verification/visibility.
//
// SECURITY: never surface a MarketplaceProvider.userId. The catalog only
// exposes what a customer is allowed to see.

import type {
  ServiceProviderPricingModel,
  ServiceProviderLocationType,
  ServiceProviderAvailabilityDay,
} from "@/types/service-provider";

// ── Category (backend-managed taxonomy) ───────────────────────

export interface ServiceMarketplaceCategory {
  id: string;
  name: string;
  group: string;
  /** URL-safe kebab slug (e.g. "repairs-maintenance"). */
  slug: string;
  /** Number of currently available services in this category. */
  serviceCount: number;
}

// ── Public provider projection ────────────────────────────────

export interface MarketplaceProviderPortfolioItem {
  id: string;
  image: string;
  title: string;
  description: string;
  categoryId: string;
}

export interface MarketplaceProvider {
  id: string;
  slug: string;
  displayName: string;
  tagline?: string;
  description?: string;
  logoUrl?: string | null;
  coverUrl?: string | null;
  type: string;
  verified: boolean;
  verificationStatus: "approved" | "pending" | "unverified";
  rating: number;
  ratingCount: number;
  totalBookings: number;
  primaryCategoryId: string;
  secondaryCategoryIds: string[];
  specialties: string[];
  primaryCampusId: string;
  additionalCampusIds: string[];
  serviceCities?: string[];
  serviceRadiusKm?: number;
  responseTime?: string;
  joinedYear: number;
  languages?: string[];
  portfolio: MarketplaceProviderPortfolioItem[];
  policies: { title: string; body: string }[];
  /** Open hours — shown in "Availability" summaries (who's open when). */
  availability: {
    days: ServiceProviderAvailabilityDay[];
    bookingPreference: "instant" | "request_approval";
    minAdvanceNoticeHours: number;
  };
}

// ── Public service projection ─────────────────────────────────

export interface MarketplaceService {
  id: string;
  providerId: string;
  name: string;
  description: string;
  categoryId: string;
  pricingModel: ServiceProviderPricingModel;
  price: number;
  priceMax?: number;
  durationMinutes: number;
  locationType: ServiceProviderLocationType;
  imageUrl?: string;
  isActive: boolean;
  isFeatured: boolean;
  createdAt: string;
  viewCount: number;
  /** What the customer gets (backend-filled, e.g. ["30-day warranty"]). */
  whatsIncluded?: string[];
  tags?: string[];
}

// ── Public review projection (approved / visible only) ────────

export interface MarketplaceServiceReview {
  id: string;
  providerId: string;
  serviceId?: string;
  authorName: string;
  rating: number; // 1..5
  comment: string;
  createdAt: string;
}

// ── Availability summary (derived, public) ────────────────────

export interface MarketplaceAvailabilitySummary {
  openDays: number; // days available per week
  openToday: boolean;
  bookingPreferenceLabel: string;
  onlineAvailable: boolean;
  note?: string;
}

// ── Query / pagination ────────────────────────────────────────

export type ServiceSortOption =
  | "recommended"
  | "top_rated"
  | "most_popular"
  | "price_low"
  | "price_high"
  | "newest";

export type ServicePriceBucket =
  | ""
  | "free"
  | "under_5000"
  | "5000_10000"
  | "10000_25000"
  | "25000_plus";

export interface MarketplaceServiceQuery {
  q?: string;
  categoryId?: string;
  /** Expanded set of ids a listing may carry for the chosen category (node + descendants). */
  categoryIds?: string[];
  campusId?: string;
  ratingMin?: number;
  priceBucket?: ServicePriceBucket;
  locationType?: ServiceProviderLocationType;
  sort?: ServiceSortOption;
  page?: number;
  pageSize?: number;
}

export interface MarketplaceServicePage {
  items: MarketplaceService[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ── Report service ────────────────────────────────────────────

export type ServiceReportReason =
  | "fraud"
  | "misleading"
  | "inappropriate"
  | "spam"
  | "other";

export interface ServiceReportInput {
  serviceId: string;
  userId?: string;
  reason: ServiceReportReason;
  details?: string;
}

// ── Request quote (no negotiation; prepare-only) ──────────────

export interface RequestQuoteInput {
  serviceId: string;
  providerId: string;
  requirements: string;
  preferredDate?: string;
  location?: string;
  message?: string;
}

export interface RequestQuoteResult {
  success: boolean;
  id?: string;
  message: string;
}