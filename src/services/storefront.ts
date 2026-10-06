import type {
  ReportStoreReason,
  StoreAvailabilityStatus,
  StoreCategory,
  StoreDeliveryInfo,
  StorePolicy,
  StoreVerificationStatus,
  Storefront,
} from "@/types/storefront";
import { apiClient, type ApiError } from "@/lib/api-client";
import { getTargetRatingSummary } from "@/services/reviews";
import { VERIFICATION_LABEL, AVAILABILITY_LABEL } from "@/data/storefront";

// ============================================================
// PUBLIC VENDOR STOREFRONT SERVICE
// ============================================================
//
// One public endpoint describes a store: GET /vendors/slug/:slug/storefront
// returns only what the vendor chose to publish (tagline, hours, delivery,
// policies), the live product count and categories, and the follower count.
// The rating comes from the reviews API. Nothing here is bundled demo data.
//
//   POST   /vendors/:id/follow    DELETE /vendors/:id/follow
//   POST   /vendors/:id/report

/** What GET /vendors/slug/:slug/storefront returns. */
export interface StorefrontApiResponse {
  vendorId: string;
  slug: string;
  storeName: string;
  logo: string | null;
  coverImage: string | null;
  tagline: string | null;
  description: string;
  verificationStatus: StoreVerificationStatus;
  availabilityStatus: StoreAvailabilityStatus;
  productsCount: number;
  categories: StoreCategory[];
  followers: number;
  viewerFollows: boolean;
  campusId: string;
  campusName: string | null;
  campuses: Array<{ id: string; name: string }>;
  businessCategory: string | null;
  established: string;
  operatingHours: string | null;
  contactSupported: boolean;
  delivery: {
    campusDelivery: boolean;
    pickupAvailable: boolean;
    deliveryAreas: string[];
    estimatedDelivery: string | null;
    deliveryFee: number;
    deliveryPolicy: string | null;
    pickupLocation: string | null;
  };
  policies: StorePolicy[];
}

export function isUnavailable(storefront: Storefront): boolean {
  return storefront.availabilityStatus !== "active";
}

/** The raw storefront record; `null` when no such store exists, an error otherwise. */
export async function fetchStorefrontApi(
  slug: string
): Promise<{ data: StorefrontApiResponse | null; error: ApiError | null }> {
  const { data, error } = await apiClient.get<StorefrontApiResponse>(
    `/vendors/slug/${encodeURIComponent(slug)}/storefront`
  );
  if (error || !data?.vendorId) return { data: null, error };
  return { data, error: null };
}

/**
 * The public storefront for a slug. Resolves to `null` only when the store
 * really doesn't exist; any other failure throws so the page shows an error
 * instead of a misleading "not found".
 */
export async function fetchStorefrontBySlug(slug: string): Promise<Storefront | null> {
  const { data, error } = await fetchStorefrontApi(slug);
  if (!data) {
    if (error?.status === 404) return null;
    throw error ?? new Error("The store could not be loaded.");
  }

  const ratingRes = await getTargetRatingSummary("VENDOR", data.vendorId);
  const rating = ratingRes.summary?.average ?? 0;
  const reviewCount = ratingRes.summary?.total ?? 0;

  const delivery: StoreDeliveryInfo = {
    campusDelivery: data.delivery.campusDelivery,
    pickupAvailable: data.delivery.pickupAvailable,
    deliveryAreas: data.delivery.deliveryAreas,
    estimatedDelivery: data.delivery.estimatedDelivery ?? undefined,
    deliveryPolicy: data.delivery.deliveryPolicy ?? undefined,
  };

  return {
    vendorId: data.vendorId,
    slug: data.slug,
    storeName: data.storeName,
    logo: data.logo ?? undefined,
    coverImage: data.coverImage ?? undefined,
    tagline: data.tagline ?? "",
    description: data.description,
    verificationStatus: data.verificationStatus,
    availabilityStatus: data.availabilityStatus,
    rating,
    reviewCount,
    attestation: { followers: data.followers },
    productsCount: data.productsCount,
    categories: data.categories,
    campusId: data.campusId,
    campusName: data.campusName ?? "",
    campuses: data.campuses,
    specialties: [],
    established: data.established,
    about: {
      description: data.description || data.tagline || "",
      campus: data.campusName ?? "",
      operatingHours: data.operatingHours ?? undefined,
      established: data.established
        ? String(new Date(data.established).getFullYear())
        : undefined,
      businessCategory: data.businessCategory ?? undefined,
    },
    policies: data.policies,
    delivery,
    contactSupported: data.contactSupported,
    // Service listings aren't tied to a store yet.
    supportsServices: false,
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

// ── Follow store ────────────────────────────────────────────────────────

export interface FollowState {
  following: boolean;
  followers: number;
}

/** Whether the signed-in user follows the store, and its current follower count. */
export async function fetchFollowState(slug: string): Promise<FollowState> {
  const { data, error } = await fetchStorefrontApi(slug);
  if (!data) throw error ?? new Error("Could not load follow status.");
  return { following: data.viewerFollows, followers: data.followers };
}

async function changeFollow(vendorId: string, follow: boolean): Promise<FollowState> {
  const path = `/vendors/${vendorId}/follow`;
  const { data, error } = follow
    ? await apiClient.post<Record<string, never>, FollowState>(path, {})
    : await apiClient.delete<FollowState>(path);
  if (error || !data) throw error ?? new Error("Could not update follow.");
  return data;
}

export const followVendor = (vendorId: string) => changeFollow(vendorId, true);
export const unfollowVendor = (vendorId: string) => changeFollow(vendorId, false);

// ── Report store ────────────────────────────────────────────────────────

export interface StoreReportInput {
  vendorId: string;
  reason: ReportStoreReason;
  details?: string;
}

/** Sends a report to moderators. Resolves only once it has really been received. */
export async function reportStore(input: StoreReportInput): Promise<{ id: string }> {
  const { data, error } = await apiClient.post<
    { reason: ReportStoreReason; details?: string },
    { id: string }
  >(`/vendors/${input.vendorId}/report`, {
    reason: input.reason,
    details: input.details?.trim() || undefined,
  });
  if (error || !data) throw error ?? new Error("Could not send the report.");
  return data;
}
