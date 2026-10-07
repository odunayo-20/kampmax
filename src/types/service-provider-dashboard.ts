// ============================================================
// SERVICE PROVIDER DASHBOARD DOMAIN TYPES
// ============================================================
//
// These types model the BACKEND contract for the authenticated service-provider
// dashboard (Module 16). They are intentionally separate from the public
// profile types: the dashboard reads/writes owner-scoped records while the
// public profile is a stripped-down, backend-generated projection.
//
// SECURITY: ownership is ALWAYS derived from the authenticated identity. The
// frontend never trusts providerId / serviceId / portfolioId supplied by the
// client, and never decides approval/verification/moderation state.

import type {
  ServiceProviderAvailabilityDay,
  ServiceProviderBookingPreference,
  ServiceProviderLocationType,
  ServiceProviderOnboardingStatus,
  ServiceProviderPricingModel,
  ServiceProviderServiceStatus,
  ServiceProviderVerificationStatus,
  ServiceProviderVerificationType,
} from "@/types/service-provider";

// ── Permissions (presentation-only; backend enforces) ────────
// The frontend uses these to control which management UI is visible for the
// provider/staff member. The backend remains the authority.

export interface ServiceProviderPermissions {
  profileView: boolean;
  profileEdit: boolean;
  servicesView: boolean;
  servicesManage: boolean;
  availabilityView: boolean;
  availabilityManage: boolean;
  portfolioManage: boolean;
  reviewsView: boolean;
  settingsView: boolean;
  settingsEdit: boolean;
}

export const SERVICE_PROVIDER_PERMISSIONS: ServiceProviderPermissions = {
  profileView: true,
  profileEdit: true,
  servicesView: true,
  servicesManage: true,
  availabilityView: true,
  availabilityManage: true,
  portfolioManage: true,
  reviewsView: true,
  settingsView: true,
  settingsEdit: true,
};

// ── Dashboard metric (backend-supplied only) ─────────────────

export interface ServiceProviderDashboardMetric {
  key:
    | "active_services"
    | "total_bookings"
    | "upcoming_bookings"
    | "in_progress_bookings"
    | "average_rating"
    | "profile_views"
    | "response_time";
  label: string;
  valueLabel: string;
  tone: "positive" | "neutral" | "info" | "gold";
  sublabel?: string;
}

// ── Profile completeness (backend-computed) ──────────────────

export interface ServiceProviderProfileCompletionItem {
  key: string;
  label: string;
  description: string;
  href: string;
}

export interface ServiceProviderProfileCompletion {
  percentage: number;
  missing: ServiceProviderProfileCompletionItem[];
}

// ── Management inputs (owner writes) ─────────────────────────

export interface ServiceProviderServiceInput {
  name: string;
  description: string;
  categoryId: string;
  pricingModel: ServiceProviderPricingModel;
  price: number;
  priceMax?: number;
  durationMinutes: number;
  locationType: ServiceProviderLocationType;
  status?: ServiceProviderServiceStatus;
  images?: string[];
}

export interface ServiceProviderPortfolioItemInput {
  image: string;
  title: string;
  description: string;
  categoryId: string;
  visible?: boolean;
}

// ── Dashboard activity (backend events; never fabricated) ────

export type ServiceProviderActivityKind =
  | "profile_approved"
  | "verification_updated"
  | "service_activated"
  | "service_deactivated"
  | "service_updated"
  | "service_created"
  | "review_received"
  | "portfolio_item_added"
  | "portfolio_item_updated"
  | "availability_updated"
  | "booking_request"
  | "payout_update"
  | "system_announcement";

export interface ServiceProviderActivityEvent {
  id: string;
  kind: ServiceProviderActivityKind;
  title: string;
  message: string;
  createdAt: string;
  href?: string;
}

// ── Reviews (backend-supplied) ───────────────────────────────

export interface ServiceProviderReview {
  id: string;
  authorName: string;
  rating: number;
  comment: string;
  serviceName: string;
  createdAt: string;
  /** Whether the public profile shows this review. */
  visible: boolean;
}

export interface ServiceProviderReviewsSummary {
  /** Null until the first review is published. */
  averageRating: number | null;
  totalCount: number;
  distribution: { stars: number; count: number }[];
  recent: ServiceProviderReview[];
}

// ── Dashboard notifications (owner-scoped) ───────────────────

export type ServiceProviderNotificationKind =
  | "profile_approved"
  | "verification_update"
  | "new_review"
  | "service_moderation"
  | "booking_request"
  | "financial_update"
  | "system_announcement";

export interface ServiceProviderNotification {
  id: string;
  kind: ServiceProviderNotificationKind;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
  href?: string;
}

export interface ServiceProviderNotifications {
  items: ServiceProviderNotification[];
  unreadCount: number;
}

// ── Provider settings ────────────────────────────────────────
// Service-provider scoped. Global account settings (email/password/security)
// live in the user account module and are NOT duplicated here.

export interface ServiceProviderSettings {
  profileVisibility: "public" | "hidden";
  notificationPreferences: {
    newReviewAlerts: boolean;
    bookingRequestAlerts: boolean;
    systemAnnouncements: boolean;
  };
  bookingPreferences: {
    bookingPreference: ServiceProviderBookingPreference;
    minAdvanceNoticeHours: number;
    maxAdvanceBookingDays: number;
    appointmentBufferMinutes: number;
  };
  contactPreferences: {
    allowCalls: boolean;
    allowMessages: boolean;
    allowEmail: boolean;
  };
  serviceAreaPreferences: {
    autoAcceptWithinPrimaryCampus: boolean;
    notifyNewOutOfAreaRequests: boolean;
  };
}

export const DEFAULT_SERVICE_PROVIDER_SETTINGS: ServiceProviderSettings = {
  profileVisibility: "public",
  notificationPreferences: {
    newReviewAlerts: true,
    bookingRequestAlerts: true,
    systemAnnouncements: true,
  },
  bookingPreferences: {
    bookingPreference: "request_approval",
    minAdvanceNoticeHours: 2,
    maxAdvanceBookingDays: 30,
    appointmentBufferMinutes: 15,
  },
  contactPreferences: {
    allowCalls: true,
    allowMessages: true,
    allowEmail: false,
  },
  serviceAreaPreferences: {
    autoAcceptWithinPrimaryCampus: false,
    notifyNewOutOfAreaRequests: true,
  },
};

// ── Dashboard record (owner-scoped) ──────────────────────────
// The authenticated provider's management view. Mirrors what a future
// GET /service-provider/dashboard + profile resources return. Structured to be
// consumable by the future booking engine (availability carries buffers,
// notice windows, and booking preference).

export interface ServiceProviderDashboardProfileState {
  displayName: string;
  tagline?: string;
  description?: string;
  logo?: string | null;
  coverImage?: string | null;
  bio?: string;
  yearsExperience?: number;
  languages: string[];
  qualifications: string[];
  certifications: string[];
}

export interface ServiceProviderDashboardService {
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
  updatedAt: string;
}

export interface ServiceProviderDashboardPortfolioItem {
  id: string;
  image: string;
  title: string;
  description: string;
  categoryId: string;
  visible: boolean;
  createdAt: string;
}

export interface ServiceProviderDashboardRecord {
  /** backend-owned ids — never accepted from the client. */
  providerId: string;
  userId: string;
  slug: string;
  status: ServiceProviderOnboardingStatus;
  createdAt: string;
  updatedAt: string;
  profile: ServiceProviderDashboardProfileState;
  category: {
    primaryCategoryId?: string;
    secondaryCategoryIds: string[];
  };
  location: {
    type: ServiceProviderLocationType;
    primaryCampusId?: string;
    additionalCampusIds: string[];
    serviceCities: string[];
    serviceRadiusKm: number;
  };
  availability: {
    days: ServiceProviderAvailabilityDay[];
    appointmentBufferMinutes: number;
    minAdvanceNoticeHours: number;
    maxAdvanceBookingDays: number;
    bookingPreference: ServiceProviderBookingPreference;
  };
  pricing: {
    travelFee: number;
    emergencyFee: number;
    weekendFee: number;
    minimumBookingQuantity: number;
  };
  verification: {
    type?: ServiceProviderVerificationType;
    status: ServiceProviderVerificationStatus;
  };
  services: ServiceProviderDashboardService[];
  portfolio: ServiceProviderDashboardPortfolioItem[];
  metrics: {
    totalBookings: number;
    upcomingBookings: number;
    averageRating: number;
    profileViews: number;
    responseTime?: string;
  };
}