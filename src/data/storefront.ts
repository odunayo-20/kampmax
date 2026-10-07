import type {
  StoreAbout,
  StoreAvailabilityStatus,
  StoreDeliveryInfo,
  StorePolicy,
  StoreVerificationStatus,
} from "@/types/storefront";

// ============================================================
// PUBLIC STOREFRONT MOCK DATA
// ============================================================
//
// This data is what the backend would expose through a *public* vendor
// storefront endpoint. It contains ONLY public-facing information.
//
// SECURITY: never place internal vendor data here (bank/payout details,
// moderation data, risk scores, private contact info, verification documents).
// These fields are intentionally omitted.

export interface StorefrontMeta {
  vendorId: string;
  logo?: string;
  tagline: string;
  verificationStatus: StoreVerificationStatus;
  availabilityStatus: StoreAvailabilityStatus;
  followers: number;
  established?: string;
  responseTime?: string;
  about: StoreAbout;
  policies: StorePolicy[];
  delivery: StoreDeliveryInfo;
  contactSupported: boolean;
  /** Future service providers may support services. */
  supportsServices: boolean;
}

/** Verification state that maps to a customer-facing label without exposing reasons. */
export const VERIFICATION_LABEL: Record<StoreVerificationStatus, string> = {
  verified: "Verified Vendor",
  pending: "Pending Verification",
  unverified: "Unverified",
  restricted: "Restricted",
};

/** Availability state shown to customers without exposing internal reasons. */
export const AVAILABILITY_LABEL: Record<StoreAvailabilityStatus, string> = {
  active: "Open",
  temporarily_unavailable: "Temporarily Unavailable",
  suspended: "Closed",
  closed: "Closed",
};
