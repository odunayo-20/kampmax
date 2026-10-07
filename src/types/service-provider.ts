// ============================================================
// SERVICE PROVIDER ONBOARDING DOMAIN TYPES
// ============================================================
//
// A Service Provider profile is attached to the SAME Kampmax user account.
// It is NOT a separate auth account — the existing authenticated user activates
// a Service Provider Profile alongside their Customer/Vendor Profiles.
//
// SECURITY: the frontend never decides approval/verification/status. Every
// status value displayed is backend-authoritative. The mock service below only
// models the backend contract so the UI can be swapped to real API calls
// without changing components.

// ── Centralized status configuration ─────────────────────────
// Single source of truth for every status string. UI code must import these
// constants rather than repeating status literals.

export const SERVICE_PROVIDER_ONBOARDING_STATUS = {
  DRAFT: "DRAFT",
  IN_PROGRESS: "IN_PROGRESS",
  PENDING_REVIEW: "PENDING_REVIEW",
  MORE_INFORMATION_REQUIRED: "MORE_INFORMATION_REQUIRED",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
  SUSPENDED: "SUSPENDED",
} as const;

export type ServiceProviderOnboardingStatus =
  (typeof SERVICE_PROVIDER_ONBOARDING_STATUS)[keyof typeof SERVICE_PROVIDER_ONBOARDING_STATUS];

export const SERVICE_PROVIDER_ONBOARDING_STEP = {
  TYPE: 1,
  PROFILE: 2,
  CATEGORY: 3,
  SERVICES: 4,
  LOCATION: 5,
  AVAILABILITY: 6,
  PRICING: 7,
  PORTFOLIO: 8,
  REVIEW: 9,
} as const;

export type ServiceProviderOnboardingStepId = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

export const SERVICE_PROVIDER_ONBOARDING_STEPS = 9;

// ── Document status (single source of truth) ─────────────────

export const SERVICE_PROVIDER_DOCUMENT_STATUS = {
  NOT_UPLOADED: "not_uploaded",
  UPLOADING: "uploading",
  UPLOADED: "uploaded",
  UNDER_REVIEW: "under_review",
  APPROVED: "approved",
  REJECTED: "rejected",
  REQUIRES_REPLACEMENT: "requires_replacement",
} as const;

export type ServiceProviderDocumentStatus =
  (typeof SERVICE_PROVIDER_DOCUMENT_STATUS)[keyof typeof SERVICE_PROVIDER_DOCUMENT_STATUS];

// ── Verification section status ──────────────────────────────

export const SERVICE_PROVIDER_VERIFICATION_TYPE = {
  IDENTITY: "identity",
  BUSINESS: "business",
  PROFESSIONAL: "professional",
} as const;

export type ServiceProviderVerificationType =
  (typeof SERVICE_PROVIDER_VERIFICATION_TYPE)[keyof typeof SERVICE_PROVIDER_VERIFICATION_TYPE];

export const SERVICE_PROVIDER_VERIFICATION_STATUS = {
  NOT_REQUIRED: "not_required",
  PENDING: "pending",
  APPROVED: "approved",
  ACTION_REQUIRED: "action_required",
} as const;

export type ServiceProviderVerificationStatus =
  (typeof SERVICE_PROVIDER_VERIFICATION_STATUS)[keyof typeof SERVICE_PROVIDER_VERIFICATION_STATUS];

// ── Service status (provider-facing) ─────────────────────────

export const SERVICE_PROVIDER_SERVICE_STATUS = {
  DRAFT: "draft",
  ACTIVE: "active",
  INACTIVE: "inactive",
  PENDING_REVIEW: "pending_review",
  REJECTED: "rejected",
} as const;

export type ServiceProviderServiceStatus =
  (typeof SERVICE_PROVIDER_SERVICE_STATUS)[keyof typeof SERVICE_PROVIDER_SERVICE_STATUS];

// ── Service pricing model ────────────────────────────────────

export const SERVICE_PROVIDER_PRICING_MODEL = {
  FIXED: "fixed",
  STARTING_FROM: "starting_from",
  RANGE: "range",
  QUOTE: "quote",
} as const;

export type ServiceProviderPricingModel =
  (typeof SERVICE_PROVIDER_PRICING_MODEL)[keyof typeof SERVICE_PROVIDER_PRICING_MODEL];

// ── Service location type ────────────────────────────────────

export const SERVICE_PROVIDER_LOCATION_TYPE = {
  PROVIDER_LOCATION: "provider_location",
  CUSTOMER_LOCATION: "customer_location",
  BOTH: "both",
  ONLINE: "online",
  FLEXIBLE: "flexible",
} as const;

export type ServiceProviderLocationType =
  (typeof SERVICE_PROVIDER_LOCATION_TYPE)[keyof typeof SERVICE_PROVIDER_LOCATION_TYPE];

// ── Provider type ────────────────────────────────────────────

export const SERVICE_PROVIDER_TYPE = {
  INDIVIDUAL: "individual",
  BUSINESS: "business",
  TEAM_AGENCY: "team_agency",
} as const;

export type ServiceProviderType =
  (typeof SERVICE_PROVIDER_TYPE)[keyof typeof SERVICE_PROVIDER_TYPE];

// ── Booking preference ───────────────────────────────────────

export const SERVICE_PROVIDER_BOOKING_PREFERENCE = {
  INSTANT: "instant",
  REQUEST_APPROVAL: "request_approval",
} as const;

export type ServiceProviderBookingPreference =
  (typeof SERVICE_PROVIDER_BOOKING_PREFERENCE)[keyof typeof SERVICE_PROVIDER_BOOKING_PREFERENCE];

// ── Availability day ─────────────────────────────────────────

export interface ServiceProviderAvailabilityDay {
  dayIndex: number; // 0 = Monday ... 6 = Sunday
  label: string;
  isAvailable: boolean;
  openTime?: string; // HH:mm
  closeTime?: string; // HH:mm
  breakStart?: string;
  breakEnd?: string;
}

// ── Form data model ──────────────────────────────────────────
// Mirrors what the future backend API accepts. Only necessary fields are
// collected — small campus providers are not forced through formal company
// registration.

export interface ServiceProviderOnboardingDraft {
  /** backend-owned identifier (never trusted from the client). */
  applicationId?: string;
  userId: string;
  status: ServiceProviderOnboardingStatus;
  /** Highest step the user has reached; resume continues here. */
  currentStep: ServiceProviderOnboardingStepId;
  createdAt: string;
  updatedAt: string;
  submittedAt?: string;
  /** Public/admin-approved explanation only — never internal notes. */
  adminMessage?: string;
  /** Set when approved. The final public profile slug. */
  approvedSlug?: string;

  provider: {
    type?: ServiceProviderType;
    displayName?: string;
    bio?: string;
    description?: string;
    yearsExperience?: number;
    languages?: string[];
    qualifications?: string[];
    certifications?: string[];
    contactPreferences?: {
      allowCalls?: boolean;
      allowMessages?: boolean;
      allowEmail?: boolean;
    };
  };

  profile: {
    displayName?: string;
    logo?: string | null;
    coverImage?: string | null;
    tagline?: string;
    description?: string;
  };

  category: {
    primaryCategoryId?: string;
    secondaryCategoryIds?: string[];
  };

  services: ServiceProviderServiceDraft[];

  location: {
    type?: ServiceProviderLocationType;
    primaryCampusId?: string;
    additionalCampusIds?: string[];
    serviceCities?: string[];
    serviceRadiusKm?: number;
    address?: string; // Private, not displayed publicly
  };

  availability: {
    days?: ServiceProviderAvailabilityDay[];
    appointmentBufferMinutes?: number;
    minAdvanceNoticeHours?: number;
    maxAdvanceBookingDays?: number;
    bookingPreference?: ServiceProviderBookingPreference;
  };

  pricing: {
    travelFee?: number;
    emergencyFee?: number;
    weekendFee?: number;
    minimumBookingQuantity?: number;
  };

  portfolio: ServiceProviderPortfolioItemDraft[];

  verification: {
    type?: ServiceProviderVerificationType;
    status: ServiceProviderVerificationStatus;
  };

  documents: ServiceProviderOnboardingDocument[];
}

// ── Service draft ────────────────────────────────────────────

export interface ServiceProviderServiceDraft {
  id?: string; // temporary local id for drafts
  name: string;
  description: string;
  categoryId: string;
  pricingModel: ServiceProviderPricingModel;
  price: number;
  priceMax?: number; // for range
  durationMinutes: number;
  locationType: ServiceProviderLocationType;
  status: ServiceProviderServiceStatus;
  images?: string[];
}

// ── Portfolio item draft ─────────────────────────────────────

export interface ServiceProviderPortfolioItemDraft {
  id?: string; // temporary local id for drafts
  image: string; // private ref
  title: string;
  description: string;
  categoryId: string;
}

// ── Document record ──────────────────────────────────────────
// Sensitive. Only documents belonging to the authenticated user are shown.
// Never expose permanent public URLs.

export interface ServiceProviderOnboardingDocument {
  id?: string;
  documentType: string;
  label: string;
  required: boolean;
  acceptedFormats: string[];
  maxSizeMb: number;
  status: ServiceProviderDocumentStatus;
  fileName?: string;
  /** Private/authenticated access reference — NOT a public URL. */
  privateRef?: string;
  /** Backend-returned rejection/action message (never internal notes). */
  actionMessage?: string;
}

// ── Canned, backend-configured document list ─────────────────

export interface ServiceProviderDocumentRequirement {
  documentType: string;
  label: string;
  required: boolean;
  acceptedFormats: string[];
  maxSizeMb: number;
}

// ── Onboarding entry/status summary (for the profile center) ─

export interface ServiceProviderOnboardingSummary {
  userId: string;
  hasServiceProviderProfile: boolean;
  status: ServiceProviderOnboardingStatus | null;
  currentStep: ServiceProviderOnboardingStepId | null;
  displayName?: string;
  /** URL to resume, safe for the logged-in owner only. */
  resumePath?: string;
}

// ── Service Provider Profile (public) ────────────────────────

export interface ServiceProviderProfile {
  id: string;
  userId: string;
  slug: string;
  displayName: string;
  tagline?: string;
  description?: string;
  logo?: string | null;
  coverImage?: string | null;
  type: ServiceProviderType;
  primaryCategoryId?: string;
  secondaryCategoryIds: string[];
  services: ServiceProviderService[];
  location: {
    type: ServiceProviderLocationType;
    primaryCampusId?: string;
    additionalCampusIds: string[];
    serviceCities?: string[];
    serviceRadiusKm?: number;
  };
  availability: {
    days: ServiceProviderAvailabilityDay[];
    appointmentBufferMinutes?: number;
    minAdvanceNoticeHours?: number;
    maxAdvanceBookingDays?: number;
    bookingPreference: ServiceProviderBookingPreference;
  };
  pricing: {
    travelFee?: number;
    emergencyFee?: number;
    weekendFee?: number;
    minimumBookingQuantity?: number;
  };
  portfolio: ServiceProviderPortfolioItem[];
  verification: {
    type?: ServiceProviderVerificationType;
    status: ServiceProviderVerificationStatus;
  };
  rating: number;
  totalBookings: number;
  verified: boolean;
  campusId?: string;
  specialties: string[];
  responseTime?: string;
  joinDate?: string;
}

// ── Service (public) ─────────────────────────────────────────

export interface ServiceProviderService {
  id: string;
  name: string;
  description: string;
  categoryId: string;
  pricingModel: ServiceProviderPricingModel;
  price: number;
  priceMax?: number;
  durationMinutes: number;
  locationType: ServiceProviderLocationType;
  status: ServiceProviderServiceStatus;
  images?: string[];
}

// ── Portfolio item (public) ──────────────────────────────────

export interface ServiceProviderPortfolioItem {
  id: string;
  image: string;
  title: string;
  description: string;
  categoryId: string;
}

// ── Helpers ──────────────────────────────────────────────────

export const SP_ONBOARDING_STEP_LABELS: Record<ServiceProviderOnboardingStepId, string> = {
  1: "Provider Type",
  2: "Profile",
  3: "Categories",
  4: "Services",
  5: "Location",
  6: "Availability",
  7: "Pricing",
  8: "Portfolio",
  9: "Review & Submit",
};

export const SP_ONBOARDING_STEP_DESCRIPTIONS: Record<ServiceProviderOnboardingStepId, string> = {
  1: "How do you operate — as an individual, business, or team?",
  2: "Your display name, bio, and what makes your service unique.",
  3: "Choose the service categories you offer.",
  4: "Add individual services with pricing and duration.",
  5: "Define where you operate — campus, city, or online.",
  6: "Set your working hours, booking preferences, and buffers.",
  7: "Configure travel fees, emergency fees, and pricing rules.",
  8: "Showcase your work with portfolio images.",
  9: "Review everything and submit your application.",
};

/** Statuses that should show a focused "action" state, not the steps. */
export const BLOCKING_SP_ONBOARDING_STATUSES: ServiceProviderOnboardingStatus[] = [
  SERVICE_PROVIDER_ONBOARDING_STATUS.PENDING_REVIEW,
  SERVICE_PROVIDER_ONBOARDING_STATUS.APPROVED,
  SERVICE_PROVIDER_ONBOARDING_STATUS.REJECTED,
  SERVICE_PROVIDER_ONBOARDING_STATUS.SUSPENDED,
];

// ── Type guards / helpers ────────────────────────────────────

export function isSpBlockingStatus(status: ServiceProviderOnboardingStatus | null | undefined): boolean {
  if (!status) return false;
  return BLOCKING_SP_ONBOARDING_STATUSES.includes(status);
}

// ── Submission result (backend-authoritative) ─────────────────

export const SERVICE_PROVIDER_SUBMIT_RESULT = {
  SUBMITTED: "submitted",
  MISSING_INFORMATION: "missing_information",
  DOCUMENT_REQUIRED: "document_required",
  VERIFICATION_REQUIRED: "verification_required",
  ALREADY_SUBMITTED: "already_submitted",
} as const;

export type ServiceProviderSubmitResult =
  (typeof SERVICE_PROVIDER_SUBMIT_RESULT)[keyof typeof SERVICE_PROVIDER_SUBMIT_RESULT];

type ValuesOf<T> = T[keyof T];