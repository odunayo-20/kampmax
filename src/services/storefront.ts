import type {
  ReportStoreReason,
  StoreCategory,
  StoreProductPage,
  StoreProductQuery,
  StoreReview,
  Storefront,
} from "@/types/storefront";
import { getVendorBySlug, getVendorById, getCurrentUser, fetchVendorBySlug } from "@/services/users";
import { getProductsByVendor, fetchProducts } from "@/services/products";
import { getCampusById } from "@/services/campus";
import { getCategoryById } from "@/services/categories";
import {
  getReviewsByVendor,
  getReviewSummary,
  sortReviews,
  listPublicReviews,
  getTargetRatingSummary,
} from "@/services/reviews";
import { storefrontMeta, VERIFICATION_LABEL, AVAILABILITY_LABEL } from "@/data/storefront";
import type { Product, Vendor } from "@/types";
import type { ReviewSortOption } from "@/types";

export function isProductPublishable(p: Product): boolean {
  const pubStatus = p.publishedStatus ?? "active";
  return p.status === "available" && pubStatus === "active";
}

export function hasStock(p: Product): boolean {
  if (p.stock === undefined) return true;
  return p.stock > 0;
}

// ============================================================
// PUBLIC VENDOR STOREFRONT SERVICE (repository)
// ============================================================
//
// Isolates all storefront data access behind a single module that maps 1:1 to
// a future public API:
//   GET /vendors/:slug
//   GET /vendors/:slug/products
//   GET /vendors/:slug/reviews
//   POST /vendors/:id/follow
//   DELETE /vendors/:id/follow
//   POST /vendors/:id/report
//
// Only public data is ever returned. Follow/report mutate backend state;
// here they operate on in-memory maps (mock).

// ── Storefront view model ───────────────────────────────────────────────

export function getStorefrontBySlug(slug: string): Storefront | null {
  const vendor = getVendorBySlug(slug);
  if (!vendor) return null;
  return buildStorefront(vendor);
}

export function getStorefrontByVendorId(vendorId: string): Storefront | null {
  const vendor = getVendorById(vendorId);
  if (!vendor) return null;
  return buildStorefront(vendor);
}

export function isUnavailable(storefront: Storefront): boolean {
  return storefront.availabilityStatus !== "active";
}

/**
 * Fetch a storefront by slug from the live backend (vendor profile +
 * real product count + real rating summary). Falls back to the sync/mock
 * builder only if the vendor cannot be found at all (including in mock data).
 * GET /api/v1/vendors/slug/:slug
 */
export async function fetchStorefrontBySlug(slug: string): Promise<Storefront | null> {
  const { data: vendor } = await fetchVendorBySlug(slug);
  if (!vendor) return null;
  return buildStorefrontAsync(vendor);
}

async function buildStorefrontAsync(vendor: Vendor): Promise<Storefront> {
  const meta = storefrontMeta[vendor.id];
  const campus = getCampusById(vendor.campusId);

  const [productsRes, ratingRes] = await Promise.all([
    fetchProducts({ vendorId: vendor.id, status: "ACTIVE", limit: 1 }),
    getTargetRatingSummary("vendor", vendor.id),
  ]);

  const mockSummary = getReviewSummary(vendor.id, "vendor");
  const productsCount = productsRes.error
    ? getProductsByVendor(vendor.id).filter(isProductPublishable).length
    : productsRes.total;
  const rating = ratingRes.summary?.average ?? (mockSummary.averageRating || vendor.rating);
  const reviewCount = ratingRes.summary?.total ?? mockSummary.totalReviews;

  return {
    vendorId: vendor.id,
    slug: vendor.slug || vendor.id,
    storeName: vendor.storeName,
    logo: meta?.logo,
    coverImage: vendor.coverImage,
    tagline: meta?.tagline || vendor.description,
    description: vendor.description,
    verificationStatus: meta?.verificationStatus || (vendor.verified ? "verified" : "unverified"),
    availabilityStatus: meta?.availabilityStatus || "active",
    rating,
    reviewCount,
    attestation: { followers: meta?.followers ?? 0 },
    productsCount,
    campusId: vendor.campusId,
    campusName: campus?.name || vendor.campusId,
    campuses: [{ id: vendor.campusId, name: campus?.name || vendor.campusId }],
    specialties: vendor.specialties,
    responseTime: meta?.responseTime || vendor.responseTime,
    established: meta?.established || vendor.joinDate,
    about: meta?.about || {
      description: vendor.description,
      campus: campus?.name || vendor.campusId,
    },
    policies: meta?.policies || [],
    delivery: meta?.delivery || {
      campusDelivery: true,
      pickupAvailable: true,
      deliveryAreas: [],
    },
    contactSupported: meta?.contactSupported ?? true,
    supportsServices: meta?.supportsServices ?? false,
  };
}

function buildStorefront(vendor: NonNullable<ReturnType<typeof getVendorById>>): Storefront {
  const meta = storefrontMeta[vendor.id];
  const campus = getCampusById(vendor.campusId);
  const allProducts = getProductsByVendor(vendor.id);
  const publishableProducts = allProducts.filter(isProductPublishable);
  const summary = getReviewSummary(vendor.id, "vendor");

  return {
    vendorId: vendor.id,
    slug: vendor.slug || vendor.id,
    storeName: vendor.storeName,
    logo: meta?.logo,
    coverImage: vendor.coverImage,
    tagline: meta?.tagline || vendor.description,
    description: vendor.description,
    verificationStatus: meta?.verificationStatus || (vendor.verified ? "verified" : "unverified"),
    availabilityStatus: meta?.availabilityStatus || "active",
    rating: summary.averageRating || vendor.rating,
    reviewCount: summary.totalReviews,
    attestation: { followers: meta?.followers ?? 0 },
    productsCount: publishableProducts.length,
    campusId: vendor.campusId,
    campusName: campus?.name || vendor.campusId,
    campuses: [{ id: vendor.campusId, name: campus?.name || vendor.campusId }],
    specialties: vendor.specialties,
    responseTime: meta?.responseTime || vendor.responseTime,
    established: meta?.established || vendor.joinDate,
    about: meta?.about || {
      description: vendor.description,
      campus: campus?.name || vendor.campusId,
    },
    policies: meta?.policies || [],
    delivery: meta?.delivery || {
      campusDelivery: true,
      pickupAvailable: true,
      deliveryAreas: [],
    },
    contactSupported: meta?.contactSupported ?? true,
    supportsServices: meta?.supportsServices ?? false,
  };
}

/** Customer-facing verification label (no internal reasons exposed). */
export function verificationLabel(status: Storefront["verificationStatus"]): string {
  return VERIFICATION_LABEL[status];
}

/** Customer-facing availability label (no internal reasons exposed). */
export function availabilityLabel(status: Storefront["availabilityStatus"]): string {
  return AVAILABILITY_LABEL[status];
}

// ── Store navigation (which sections are supported) ─────────────────────

export interface StoreNavigationSections {
  products: boolean;
  services: boolean;
  reviews: boolean;
  about: boolean;
  policies: boolean;
  delivery: boolean;
  contact: boolean;
}

export function getStoreNavigationSections(store: Storefront): StoreNavigationSections {
  return {
    products: store.productsCount > 0,
    services: store.supportsServices,
    reviews: store.reviewCount > 0,
    about: Boolean(store.about && store.about.description),
    policies: store.policies.some((p) => p.enabled),
    delivery: Boolean(store.delivery && (store.delivery.campusDelivery || store.delivery.pickupAvailable)),
    contact: store.contactSupported,
  };
}

// ── Product catalog ─────────────────────────────────────────────────────

export function getStoreCategories(store: Storefront): StoreCategory[] {
  const map = new Map<string, StoreCategory>();
  getProductsByVendor(store.vendorId).forEach((p) => {
    if (!isProductPublishable(p)) return;
    // Only include real categories
    const cat = getCategoryById(p.categoryId);
    if (!cat) return;
    const existing = map.get(cat.id);
    if (existing) existing.productCount += 1;
    else map.set(cat.id, { id: cat.id, name: cat.name, productCount: 1 });
  });
  return Array.from(map.values());
}

export function getStoreProducts(
  store: Storefront,
  query: StoreProductQuery = {}
): StoreProductPage {
  const page = Math.max(1, query.page || 1);
  const pageSize = Math.max(1, query.pageSize || 20);

  let items = getProductsByVendor(store.vendorId).filter(isProductPublishable);

  // Scope searches to THIS store only.
  if (query.search) {
    const q = query.search.toLowerCase();
    items = items.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.tags?.some((t) => t.toLowerCase().includes(q))
    );
  }
  if (query.categoryId) {
    items = items.filter((p) => p.categoryId === query.categoryId);
  }
  if (query.minPrice !== undefined) {
    items = items.filter((p) => p.price >= query.minPrice!);
  }
  if (query.maxPrice !== undefined) {
    items = items.filter((p) => p.price <= query.maxPrice!);
  }
  if (query.availability === "available") {
    items = items.filter((p) => p.status === "available");
  }

  switch (query.sort) {
    case "price_asc":
      items = [...items].sort((a, b) => a.price - b.price);
      break;
    case "price_desc":
      items = [...items].sort((a, b) => b.price - a.price);
      break;
    case "rating":
      items = [...items].sort((a, b) => (b.rating || 0) - (a.rating || 0));
      break;
    case "newest":
      items = [...items].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      break;
    case "featured":
    default:
      items = [...items].sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0));
      break;
  }

  // Availability-aware handling: if store is not active, block ordering.
  // (UI disables Add to Cart based on store status AND product status.)
  const availableItems = items.filter((p) => p.status === "available");
  const unavailableCount = items.length - availableItems.length;

  // Pagination over the full (filtered) set; out-of-stock shown but not orderable.
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const start = (page - 1) * pageSize;
  const slice = items.slice(start, start + pageSize);

  return { items: slice, total, page, pageSize, totalPages, unavailableCount };
}

/**
 * Whether a customer can add a product to the cart from the storefront.
 * Blocked when the product isn't available OR the store isn't active OR not published OR out of stock.
 */
export function canAddToCart(store: Storefront, product: Product): {
  allowed: boolean;
  reason?: string;
} {
  if (!store || isUnavailable(store)) {
    return { allowed: false, reason: "This store is currently unavailable." };
  }
  if (!isProductPublishable(product)) {
    return { allowed: false, reason: "This item is currently unavailable." };
  }
  if (!hasStock(product)) {
    return { allowed: false, reason: "This item is out of stock." };
  }
  return { allowed: true };
}

// ── Reviews ─────────────────────────────────────────────────────────────

export function getStoreReviewSummary(store: Storefront) {
  return getReviewSummary(store.vendorId, "vendor");
}

export function getStoreReviews(
  store: Storefront,
  sort: ReviewSortOption = "recent"
): StoreReview[] {
  return sortReviews(getReviewsByVendor(store.vendorId), sort);
}

export function getStoreReviewsByStar(store: Storefront, star: number): StoreReview[] {
  return getReviewsByVendor(store.vendorId).filter((r) => r.rating === star);
}

// ── Follow store ────────────────────────────────────────────────────────
// Mock follows keyed by userId → Set<vendorId>. Persisted in-memory.

const followsByUser = new Map<string, Set<string>>();

export function isFollowing(vendorId: string, userId: string): boolean {
  return followsByUser.get(userId)?.has(vendorId) ?? false;
}

export function getFollowCount(vendorId: string): number {
  let count = 0;
  followsByUser.forEach((set) => {
    if (set.has(vendorId)) count += 1;
  });
  return count;
}

export function followVendor(vendorId: string, userId: string): boolean {
  let set = followsByUser.get(userId);
  if (!set) {
    set = new Set();
    followsByUser.set(userId, set);
  }
  const added = !set.has(vendorId);
  set.add(vendorId);
  return added;
}

export function unfollowVendor(vendorId: string, userId: string): boolean {
  const set = followsByUser.get(userId);
  if (!set) return false;
  const removed = set.delete(vendorId);
  if (set.size === 0) followsByUser.delete(userId);
  return removed;
}

/** Read-only current userId for follow actions. */
export function getCurrentUserId(): string {
  return getCurrentUser().id;
}

// ── Report store ────────────────────────────────────────────────────────
// Only logs a customer-facing report; never exposes moderation tools.

export interface StoreReportInput {
  vendorId: string;
  userId: string;
  reason: ReportStoreReason;
  details?: string;
}

export function reportStore(input: StoreReportInput): { success: boolean; id: string } {
  // In production this POSTs to the backend for moderation review.
  const id = `report-${Date.now()}`;
  void input;
  return { success: true, id };
}
