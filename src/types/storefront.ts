import type { Product } from "./index";
import type { Review as CoreReview } from "./index";

// ============================================================
// PUBLIC VENDOR STOREFRONT DOMAIN TYPES
// ============================================================
//
// These model the *public, customer-facing* view of a vendor store. They hold
// only information that is safe to expose publicly. Internal vendor data
// (bank/payout details, moderation data, risk scores, private contact info)
// must never be placed here or returned to the frontend.

export type StoreVerificationStatus =
  | "verified"
  | "pending"
  | "unverified"
  | "restricted";

export type StoreAvailabilityStatus =
  | "active"
  | "temporarily_unavailable"
  | "suspended"
  | "closed";

export type StoreSortOption =
  | "featured"
  | "newest"
  | "price_asc"
  | "price_desc"
  | "rating";

export interface StoreProductQuery {
  search?: string;
  categoryId?: string;
  sort?: StoreSortOption;
  minPrice?: number;
  maxPrice?: number;
  /** "available" | "out_of_stock" | "" (all) */
  availability?: string;
  page?: number;
  pageSize?: number;
}

export interface StoreProductPage {
  items: Product[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  /** Number of filtered items not currently orderable (e.g. sold/removed). */
  unavailableCount: number;
}

export interface StoreCategory {
  id: string;
  name: string;
  productCount: number;
}

export type StorePolicyType =
  | "returns"
  | "refunds"
  | "cancellation"
  | "delivery"
  | "pickup";

export interface StorePolicy {
  type: StorePolicyType;
  title: string;
  body: string;
  /** When false the vendor has NOT configured the policy. */
  enabled: boolean;
}

export interface StoreDeliveryInfo {
  campusDelivery: boolean;
  pickupAvailable: boolean;
  deliveryAreas: string[];
  estimatedDelivery?: string;
  deliveryPolicy?: string;
}

export interface StoreAbout {
  description: string;
  campus: string;
  operatingHours?: string;
  established?: string;
  businessCategory?: string;
  yearsActive?: number;
  responseTime?: string;
}

export type ReportStoreReason =
  | "fraud"
  | "counterfeit"
  | "prohibited"
  | "misleading"
  | "harassment"
  | "other";

/**
 * Public storefront view of a vendor store. `vendorId` links to the internal
 * vendor record; public URLs should use `slug` only.
 */
export interface Storefront {
  vendorId: string;
  slug: string;
  storeName: string;
  logo?: string;
  coverImage?: string;
  tagline: string;
  description: string;
  verificationStatus: StoreVerificationStatus;
  availabilityStatus: StoreAvailabilityStatus;
  rating: number;
  reviewCount: number;
  attestation: { followers: number };
  productsCount: number;
  /** Categories of the store's live products, with exact counts. */
  categories: StoreCategory[];
  campusId: string;
  campusName: string;
  campuses: { id: string; name: string }[];
  specialties: string[];
  responseTime?: string;
  established?: string;
  about: StoreAbout;
  policies: StorePolicy[];
  delivery: StoreDeliveryInfo;
  /** Whether this vendor supports customer contact via Kampmax messaging. */
  contactSupported: boolean;
  /** Whether a "services" tab is supported (future service providers). */
  supportsServices: boolean;
}

export interface StoreReview extends CoreReview {}
