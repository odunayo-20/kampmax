// ============================================================
// SERVICE PROVIDER DASHBOARD — LIVE API IMPLEMENTATION
//
// Calls the real NestJS backend service-provider + analytics endpoints:
//   profile          → GET/PATCH /service-provider/profile/me
//   services         → GET/POST/PATCH /service-provider/services
//   availability     → GET/POST/PATCH /service-provider/availability
//   bookings         → GET /service-provider/bookings/me
//   analytics        → GET /analytics/service-provider
//   booking status   → GET /analytics/service-provider/bookings/status
// ============================================================

import { apiClient } from "@/lib/api-client";
import type {
  ServiceProviderActivityEvent,
  ServiceProviderDashboardMetric,
  ServiceProviderDashboardRecord,
  ServiceProviderDashboardService,
  ServiceProviderProfileCompletion,
  ServiceProviderProfileCompletionItem,
  ServiceProviderReviewsSummary,
  ServiceProviderServiceInput,
} from "@/types/service-provider-dashboard";
import type {
  ServiceProviderAvailabilityDay,
  ServiceProviderLocationType,
  ServiceProviderPricingModel,
  ServiceProviderServiceStatus,
  ServiceProviderVerificationStatus,
} from "@/types/service-provider";
import {
  SERVICE_PROVIDER_ONBOARDING_STATUS,
  SERVICE_PROVIDER_SERVICE_STATUS,
  SERVICE_PROVIDER_VERIFICATION_STATUS,
} from "@/types/service-provider";

// ---- Backend DTO and response shapes -----------------------------------------

export interface BackendSpProfile {
  id: string;
  userId: string;
  displayName: string;
  slug: string;
  bio?: string | null;
  profileImageId?: string | null;
  logoUrl?: string | null;
  coverImageUrl?: string | null;
  verificationStatus: "PENDING" | "VERIFIED" | "SUSPENDED" | "DEACTIVATED";
  providerType?: string | null;
  yearsOfExperience?: number | null;
  locationCity?: string | null;
  locationState?: string | null;
  locationCountry?: string | null;
  serviceRadius?: string | null;
  /** How bookings are taken. */
  bookingPreference?: "INSTANT" | "REQUEST_APPROVAL";
  minAdvanceNoticeHours?: number;
  maxAdvanceBookingDays?: number;
  bufferMinutes?: number;
  isActive: boolean;
  statusReason?: string | null;
  createdAt: string;
  updatedAt?: string;
}

export interface BackendSpService {
  id: string;
  providerId: string;
  title: string;
  slug: string;
  description: string;
  categoryId?: string | null;
  pricingModel: "FIXED" | "STARTING_FROM" | "HOURLY" | "NEGOTIABLE";
  basePrice: number;
  durationMinutes?: number | null;
  serviceLocationType?: "ON_CAMPUS" | "OFF_CAMPUS" | "REMOTE" | null;
  campusAvailability?: string | null;
  status: "DRAFT" | "ACTIVE" | "INACTIVE";
  profileMediaId?: string | null;
  termsNotes?: string | null;
  createdAt: string;
  updatedAt?: string;
}

export interface BackendSpAvailabilitySlot {
  id: string;
  providerId: string;
  dayOfWeek: number; // 0=Sunday, 1=Monday, ... 6=Saturday
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface BackendSpAnalyticsOverview {
  totalBookings?: number;
  completedBookings?: number;
  activeServices?: number;
  totalServices?: number;
  profileViews?: number;
  averageRating?: number;
  ratingCount?: number;
  [key: string]: unknown;
}

export interface BackendSpBookingStatusCounts {
  pending?: number;
  accepted?: number;
  in_progress?: number;
  completed?: number;
  cancelled?: number;
  rejected?: number;
  [key: string]: number | undefined;
}

export interface BackendSpBookingRow {
  id: string;
  serviceId: string;
  customerId: string;
  status: string;
  scheduledDate: string;
  scheduledTime: string;
  durationMinutes?: number;
  customerNotes?: string;
  createdAt: string;
  customer?: { id: string; name?: string; email?: string };
  service?: { id: string; title?: string };
}

// ---- Mapping helpers ---------------------------------------------------------

const DAY_SPECS = [
  { dayIndex: 0, dayOfWeek: 1, label: "Monday" },
  { dayIndex: 1, dayOfWeek: 2, label: "Tuesday" },
  { dayIndex: 2, dayOfWeek: 3, label: "Wednesday" },
  { dayIndex: 3, dayOfWeek: 4, label: "Thursday" },
  { dayIndex: 4, dayOfWeek: 5, label: "Friday" },
  { dayIndex: 5, dayOfWeek: 6, label: "Saturday" },
  { dayIndex: 6, dayOfWeek: 0, label: "Sunday" },
];

function mapPricingModelToFrontend(backend: string): ServiceProviderPricingModel {
  switch (backend) {
    case "STARTING_FROM":
      return "starting_from";
    case "HOURLY":
    case "NEGOTIABLE":
      return "quote";
    case "FIXED":
    default:
      return "fixed";
  }
}

function mapPricingModelToBackend(
  frontend: ServiceProviderPricingModel
): "FIXED" | "STARTING_FROM" | "HOURLY" | "NEGOTIABLE" {
  switch (frontend) {
    case "starting_from":
      return "STARTING_FROM";
    case "quote":
      return "NEGOTIABLE";
    case "range":
      return "STARTING_FROM";
    case "fixed":
    default:
      return "FIXED";
  }
}

function mapLocationTypeToFrontend(backend?: string | null): ServiceProviderLocationType {
  switch (backend) {
    case "OFF_CAMPUS":
      return "customer_location";
    case "REMOTE":
      return "online";
    case "ON_CAMPUS":
    default:
      return "provider_location";
  }
}

function mapLocationTypeToBackend(
  frontend: ServiceProviderLocationType
): "ON_CAMPUS" | "OFF_CAMPUS" | "REMOTE" {
  switch (frontend) {
    case "customer_location":
      return "OFF_CAMPUS";
    case "online":
      return "REMOTE";
    case "both":
    case "flexible":
    case "provider_location":
    default:
      return "ON_CAMPUS";
  }
}

function mapVerificationStatusToFrontend(
  backend: string
): ServiceProviderVerificationStatus {
  switch (backend) {
    case "VERIFIED":
      return SERVICE_PROVIDER_VERIFICATION_STATUS.APPROVED;
    case "SUSPENDED":
    case "DEACTIVATED":
      return SERVICE_PROVIDER_VERIFICATION_STATUS.ACTION_REQUIRED;
    case "PENDING":
    default:
      return SERVICE_PROVIDER_VERIFICATION_STATUS.PENDING;
  }
}

export function mapBackendService(
  s: BackendSpService
): ServiceProviderDashboardService {
  return {
    id: s.id,
    name: s.title,
    description: s.description,
    categoryId: s.categoryId ?? "",
    pricingModel: mapPricingModelToFrontend(s.pricingModel),
    price: s.basePrice,
    durationMinutes: s.durationMinutes ?? 60,
    locationType: mapLocationTypeToFrontend(s.serviceLocationType),
    status: (s.status.toLowerCase() ?? "draft") as ServiceProviderServiceStatus,
    images: s.profileMediaId ? [s.profileMediaId] : [],
    updatedAt: s.updatedAt || s.createdAt || new Date().toISOString(),
  };
}

export function mapBackendAvailability(
  slots: BackendSpAvailabilitySlot[]
): ServiceProviderAvailabilityDay[] {
  const byDay = new Map<number, BackendSpAvailabilitySlot>();
  slots.forEach((s) => byDay.set(s.dayOfWeek, s));

  return DAY_SPECS.map((spec) => {
    const slot = byDay.get(spec.dayOfWeek);
    return {
      dayIndex: spec.dayIndex,
      label: spec.label,
      isAvailable: slot ? slot.isActive : spec.dayIndex < 5,
      openTime: slot?.startTime || "09:00",
      closeTime: slot?.endTime || "17:00",
    };
  });
}

export function buildDashboardRecordFromLive(
  profile: BackendSpProfile,
  services: BackendSpService[],
  availabilitySlots: BackendSpAvailabilitySlot[],
  analytics?: BackendSpAnalyticsOverview | null
): ServiceProviderDashboardRecord {
  const mappedServices = services.map(mapBackendService);
  const mappedDays = mapBackendAvailability(availabilitySlots);

  return {
    providerId: profile.id,
    userId: profile.userId,
    slug: profile.slug,
    status: profile.isActive
      ? SERVICE_PROVIDER_ONBOARDING_STATUS.APPROVED
      : SERVICE_PROVIDER_ONBOARDING_STATUS.PENDING_REVIEW,
    createdAt: profile.createdAt,
    updatedAt: profile.updatedAt || profile.createdAt || new Date().toISOString(),
    profile: {
      displayName: profile.displayName,
      tagline: profile.bio ?? undefined,
      description: profile.bio ?? "",
      logo: profile.logoUrl ?? null,
      coverImage: profile.coverImageUrl ?? null,
      bio: profile.bio ?? "",
      yearsExperience: profile.yearsOfExperience ?? 0,
      languages: ["English"],
      qualifications: [],
      certifications: [],
    },
    category: {
      primaryCategoryId: mappedServices[0]?.categoryId,
      secondaryCategoryIds: [],
    },
    location: {
      type: "both",
      primaryCampusId: profile.locationCity ?? "",
      additionalCampusIds: [],
      serviceCities: profile.locationState ? [profile.locationState] : [],
      serviceRadiusKm: Number(profile.serviceRadius) || 10,
    },
    availability: {
      days: mappedDays,
      appointmentBufferMinutes: 15,
      minAdvanceNoticeHours: 2,
      maxAdvanceBookingDays: 30,
      bookingPreference: "request_approval",
    },
    pricing: {
      travelFee: 0,
      emergencyFee: 0,
      weekendFee: 0,
      minimumBookingQuantity: 1,
    },
    verification: {
      status: mapVerificationStatusToFrontend(profile.verificationStatus),
    },
    services: mappedServices,
    portfolio: [],
    metrics: {
      totalBookings: analytics?.totalBookings ?? 0,
      upcomingBookings: 0,
      averageRating: analytics?.averageRating ?? 5.0,
      profileViews: analytics?.profileViews ?? 0,
    },
  };
}

export function computeProfileCompletionFromLive(
  record: ServiceProviderDashboardRecord
): ServiceProviderProfileCompletion {
  const missing: ServiceProviderProfileCompletionItem[] = [];
  let percentage = 0;

  const displayNameOk = !!record.profile.displayName?.trim();
  const bioOk = !!(record.profile.bio?.trim() || record.profile.description?.trim());

  if (displayNameOk && bioOk) {
    percentage += 35;
  } else {
    if (!displayNameOk) {
      missing.push({
        key: "display_name",
        label: "Profile name",
        description: "Add your display name.",
        href: "/service-provider/profile",
      });
    }
    if (!bioOk) {
      missing.push({
        key: "bio",
        label: "Profile description",
        description: "Tell customers about your experience and skills.",
        href: "/service-provider/profile",
      });
    }
  }

  const activeCount = record.services.filter(
    (s) => s.status === SERVICE_PROVIDER_SERVICE_STATUS.ACTIVE
  ).length;

  if (activeCount >= 3) {
    percentage += 25;
  } else if (activeCount >= 1) {
    percentage += 15;
    missing.push({
      key: "more_services",
      label: "Additional services",
      description: "Add more services to improve discovery across campuses.",
      href: "/service-provider/services/new",
    });
  } else {
    missing.push({
      key: "services",
      label: "Services",
      description: "Create at least one service offering so customers can book you.",
      href: "/service-provider/services/new",
    });
  }

  if (record.availability.days.some((d) => d.isAvailable)) {
    percentage += 20;
  } else {
    missing.push({
      key: "availability",
      label: "Availability",
      description: "Set your working hours so customers know when you're available.",
      href: "/service-provider/availability",
    });
  }

  if (record.verification.status === SERVICE_PROVIDER_VERIFICATION_STATUS.APPROVED) {
    percentage += 20;
  } else {
    missing.push({
      key: "verification",
      label: "Verification",
      description: "Submit verification to unlock the verified badge and build trust.",
      href: "/service-provider/verification",
    });
  }

  return { percentage: Math.min(100, percentage), missing };
}

// ============================================================
// LIVE API FUNCTIONS
// ============================================================

/**
 * Fetches full live dashboard bundle from backend:
 * Profile + Services + Availability + Analytics + Incoming Bookings.
 */
export async function fetchSpDashboardLive(): Promise<{
  record: ServiceProviderDashboardRecord;
  metrics: ServiceProviderDashboardMetric[];
  activity: ServiceProviderActivityEvent[];
}> {
  const [profileRes, servicesRes, availabilityRes, analyticsRes, bookingStatusRes, bookingsRes] =
    await Promise.all([
      apiClient.get<BackendSpProfile>("/service-provider/profile/me"),
      apiClient.get<BackendSpService[]>("/service-provider/services/me"),
      apiClient.get<BackendSpAvailabilitySlot[]>("/service-provider/availability/me"),
      apiClient.get<BackendSpAnalyticsOverview>("/analytics/service-provider"),
      apiClient.get<BackendSpBookingStatusCounts>("/analytics/service-provider/bookings/status"),
      apiClient.get<BackendSpBookingRow[]>("/service-provider/bookings/me"),
    ]);

  if (profileRes.error || !profileRes.data) {
    throw profileRes.error || new Error("Failed to load service provider profile");
  }

  const profile = profileRes.data;
  const services = servicesRes.data || [];
  const availability = availabilityRes.data || [];
  const analytics = analyticsRes.data;
  const statusCounts = bookingStatusRes.data || {};
  const bookings = bookingsRes.data || [];

  const record = buildDashboardRecordFromLive(profile, services, availability, analytics);

  const activeServicesCount = services.filter((s) => s.status === "ACTIVE").length;
  const pendingBookings = statusCounts.pending ?? 0;
  const acceptedBookings = statusCounts.accepted ?? 0;
  const inProgressBookings = statusCounts.in_progress ?? 0;
  const completedBookings = statusCounts.completed ?? 0;
  const cancelledBookings = statusCounts.cancelled ?? 0;
  const totalBookings =
    (analytics?.totalBookings ??
      pendingBookings + acceptedBookings + inProgressBookings + completedBookings + cancelledBookings) ||
    bookings.length;

  const metrics: ServiceProviderDashboardMetric[] = [
    {
      key: "active_services",
      label: "Active Services",
      valueLabel: String(activeServicesCount),
      tone: "positive",
      sublabel: `${services.length} total listing${services.length !== 1 ? "s" : ""}`,
    },
    {
      key: "total_bookings",
      label: "Total Bookings",
      valueLabel: String(totalBookings),
      tone: "neutral",
    },
    {
      key: "upcoming_bookings",
      label: "Upcoming Bookings",
      valueLabel: String(acceptedBookings),
      tone: "info",
      sublabel: pendingBookings > 0
        ? `${pendingBookings} awaiting confirmation`
        : "Confirmed bookings",
    },
    {
      key: "in_progress_bookings",
      label: "In Progress",
      valueLabel: String(inProgressBookings),
      tone: "info",
      sublabel: `${completedBookings} completed · ${cancelledBookings} cancelled`,
    },
    {
      key: "average_rating",
      label: "Average Rating",
      valueLabel: (analytics?.averageRating ?? 5.0).toFixed(1),
      tone: "gold",
      sublabel: "5-star rating",
    },
    {
      key: "profile_views",
      label: "Profile Views",
      valueLabel: String(analytics?.profileViews ?? 0),
      tone: "neutral",
      sublabel: "this month",
    },
  ];

  // Map real recent bookings to activity events
  const activity: ServiceProviderActivityEvent[] = bookings.slice(0, 10).map((b) => ({
    id: `spa_b_${b.id}`,
    kind: "booking_request",
    title: b.status === "pending" ? "New booking request" : `Booking ${b.status}`,
    message: `${b.service?.title || "Service"} on ${b.scheduledDate} (${b.scheduledTime})`,
    createdAt: b.createdAt || new Date().toISOString(),
    href: `/service-provider/bookings`,
  }));

  if (activity.length === 0) {
    activity.push({
      id: `spa_init_${profile.id}`,
      kind: "profile_approved",
      title: "Profile active",
      message: `Your service provider profile "${profile.displayName}" is active.`,
      createdAt: profile.createdAt,
      href: "/service-provider/profile",
    });
  }

  return { record, metrics, activity };
}

/**
 * Fetches own service provider profile record.
 */
export async function fetchSpProfileRecordLive(): Promise<ServiceProviderDashboardRecord> {
  const [profileRes, servicesRes, availabilityRes] = await Promise.all([
    apiClient.get<BackendSpProfile>("/service-provider/profile/me"),
    apiClient.get<BackendSpService[]>("/service-provider/services/me"),
    apiClient.get<BackendSpAvailabilitySlot[]>("/service-provider/availability/me"),
  ]);

  if (profileRes.error || !profileRes.data) {
    throw profileRes.error || new Error("Failed to load profile");
  }

  return buildDashboardRecordFromLive(
    profileRes.data,
    servicesRes.data || [],
    availabilityRes.data || []
  );
}

/**
 * Updates service provider profile on the live backend.
 */
export async function updateSpProfileLive(
  patch: Partial<{
    displayName: string;
    bio: string;
    description: string;
    yearsExperience: number;
    profileImageId: string;
    locationCity: string;
    locationState: string;
    serviceRadius: string;
    bookingPreference: "INSTANT" | "REQUEST_APPROVAL";
    minAdvanceNoticeHours: number;
    maxAdvanceBookingDays: number;
    bufferMinutes: number;
  }>
): Promise<{ ok: boolean; error?: string; record?: ServiceProviderDashboardRecord }> {
  const payload: Record<string, unknown> = {};
  if (patch.displayName !== undefined) payload.displayName = patch.displayName.trim();
  if (patch.bio !== undefined) payload.bio = patch.bio.trim();
  if (patch.description !== undefined && !payload.bio) payload.bio = patch.description.trim();
  if (patch.yearsExperience !== undefined) payload.yearsOfExperience = patch.yearsExperience;
  if (patch.profileImageId !== undefined) payload.profileImageId = patch.profileImageId;
  if (patch.locationCity !== undefined) payload.locationCity = patch.locationCity;
  if (patch.locationState !== undefined) payload.locationState = patch.locationState;
  if (patch.serviceRadius !== undefined) payload.serviceRadius = patch.serviceRadius;
  if (patch.bookingPreference !== undefined) payload.bookingPreference = patch.bookingPreference;
  if (patch.minAdvanceNoticeHours !== undefined) payload.minAdvanceNoticeHours = patch.minAdvanceNoticeHours;
  if (patch.maxAdvanceBookingDays !== undefined) payload.maxAdvanceBookingDays = patch.maxAdvanceBookingDays;
  if (patch.bufferMinutes !== undefined) payload.bufferMinutes = patch.bufferMinutes;

  const { data, error } = await apiClient.patch<Record<string, unknown>, BackendSpProfile>(
    "/service-provider/profile/me",
    payload
  );

  if (error || !data) {
    return { ok: false, error: error?.message || "Failed to update profile" };
  }

  const fullRecord = await fetchSpProfileRecordLive();
  return { ok: true, record: fullRecord };
}

/**
 * Fetches all services owned by current provider from live backend.
 */
export async function fetchSpServicesLive(): Promise<ServiceProviderDashboardService[]> {
  const res = await apiClient.get<BackendSpService[]>("/service-provider/services/me");
  if (res.error || !res.data) {
    return [];
  }
  return res.data.map(mapBackendService).sort((a, b) =>
    new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
}

/**
 * Creates a new service offering on the live backend.
 */
export async function addSpDashboardServiceLive(
  input: ServiceProviderServiceInput
): Promise<{ ok: boolean; service?: ServiceProviderDashboardService; error?: string }> {
  if (!input.name.trim()) return { ok: false, error: "Service name is required." };
  if (!input.categoryId) return { ok: false, error: "Choose a category." };
  if (input.price < 0) return { ok: false, error: "Price must be zero or more." };
  if (input.durationMinutes <= 0) return { ok: false, error: "Duration must be positive." };

  const slug =
    input.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") +
    "-" +
    Date.now().toString(36);

  const payload: Record<string, unknown> = {
    title: input.name.trim(),
    slug,
    description: input.description.trim(),
    categoryId: input.categoryId,
    pricingModel: mapPricingModelToBackend(input.pricingModel),
    basePrice: input.price,
    durationMinutes: input.durationMinutes,
    serviceLocationType: mapLocationTypeToBackend(input.locationType),
    termsNotes: "",
  };

  const { data, error } = await apiClient.post<Record<string, unknown>, BackendSpService>(
    "/service-provider/services",
    payload
  );

  if (error || !data || !data.id) {
    return { ok: false, error: error?.message || "Failed to create service" };
  }

  return { ok: true, service: mapBackendService(data) };
}

/**
 * Updates an existing service offering on the live backend.
 */
export async function updateSpDashboardServiceLive(
  serviceId: string,
  patch: Partial<ServiceProviderServiceInput>
): Promise<{ ok: boolean; error?: string; service?: ServiceProviderDashboardService }> {
  const payload: Record<string, unknown> = {};
  if (patch.name !== undefined) payload.title = patch.name.trim();
  if (patch.description !== undefined) payload.description = patch.description.trim();
  if (patch.categoryId !== undefined) payload.categoryId = patch.categoryId;
  if (patch.pricingModel !== undefined) {
    payload.pricingModel = mapPricingModelToBackend(patch.pricingModel);
  }
  if (patch.price !== undefined) payload.basePrice = patch.price;
  if (patch.durationMinutes !== undefined) payload.durationMinutes = patch.durationMinutes;
  if (patch.locationType !== undefined) {
    payload.serviceLocationType = mapLocationTypeToBackend(patch.locationType);
  }

  const { data, error } = await apiClient.patch<Record<string, unknown>, BackendSpService>(
    `/service-provider/services/${serviceId}`,
    payload
  );

  if (error || !data || !data.id) {
    return { ok: false, error: error?.message || "Failed to update service" };
  }

  return { ok: true, service: mapBackendService(data) };
}

/**
 * Deactivates or removes a service offering on the backend.
 */
export async function setSpDashboardServiceStatusLive(
  serviceId: string,
  status: "active" | "inactive"
): Promise<{ ok: boolean; error?: string; service?: ServiceProviderDashboardService }> {
  const { data, error } = await apiClient.patch<{ status: "ACTIVE" | "INACTIVE" }, BackendSpService>(
    `/service-provider/services/${serviceId}`,
    { status: status === "active" ? "ACTIVE" : "INACTIVE" }
  );

  if (error || !data || !data.id) {
    return { ok: false, error: error?.message || "Failed to update service status" };
  }

  return { ok: true, service: mapBackendService(data) };
}

/**
 * Fetches weekly availability schedule from the live backend.
 */
export async function fetchSpAvailabilityLive(): Promise<{
  availability: ServiceProviderDashboardRecord["availability"];
  pricing: ServiceProviderDashboardRecord["pricing"];
  location: ServiceProviderDashboardRecord["location"];
}> {
  const [profileRes, slotsRes] = await Promise.all([
    apiClient.get<BackendSpProfile>("/service-provider/profile/me"),
    apiClient.get<BackendSpAvailabilitySlot[]>("/service-provider/availability/me"),
  ]);

  const profile = profileRes.data;
  const slots = slotsRes.data || [];
  const days = mapBackendAvailability(slots);

  return {
    availability: {
      days,
      bookingPreference: profile?.bookingPreference === "INSTANT" ? "instant" : "request_approval",
      minAdvanceNoticeHours: profile?.minAdvanceNoticeHours ?? 2,
      maxAdvanceBookingDays: profile?.maxAdvanceBookingDays ?? 30,
      appointmentBufferMinutes: profile?.bufferMinutes ?? 15,
    },
    pricing: {
      travelFee: 0,
      emergencyFee: 0,
      weekendFee: 0,
      minimumBookingQuantity: 1,
    },
    location: {
      type: "both",
      primaryCampusId: profile?.locationCity ?? "",
      additionalCampusIds: [],
      serviceCities: profile?.locationState ? [profile.locationState] : [],
      serviceRadiusKm: Number(profile?.serviceRadius) || 10,
    },
  };
}

/**
 * Saves availability schedule to live backend (creates or updates slots).
 */
export async function updateSpAvailabilityLive(
  days: ServiceProviderAvailabilityDay[]
): Promise<{ ok: boolean; error?: string }> {
  const existingRes = await apiClient.get<BackendSpAvailabilitySlot[]>(
    "/service-provider/availability/me"
  );
  const existingMap = new Map((existingRes.data || []).map((s) => [s.dayOfWeek, s]));

  const savePromises = days.map(async (day) => {
    const dayOfWeek = day.dayIndex === 6 ? 0 : day.dayIndex + 1;
    const existing = existingMap.get(dayOfWeek);

    if (existing) {
      return apiClient.patch<{ startTime: string; endTime: string; isActive: boolean }, BackendSpAvailabilitySlot>(
        `/service-provider/availability/${existing.id}`,
        {
          startTime: day.openTime || "09:00",
          endTime: day.closeTime || "17:00",
          isActive: day.isAvailable,
        }
      );
    } else {
      return apiClient.post<{ dayOfWeek: number; startTime: string; endTime: string; isActive: boolean }, BackendSpAvailabilitySlot>(
        "/service-provider/availability",
        {
          dayOfWeek,
          startTime: day.openTime || "09:00",
          endTime: day.closeTime || "17:00",
          isActive: day.isAvailable,
        }
      );
    }
  });

  const results = await Promise.all(savePromises);
  const failure = results.find((r) => r.error);
  if (failure) {
    return { ok: false, error: failure.error?.message || "Failed to save weekly schedule" };
  }

  return { ok: true };
}

/**
 * The ratings customers left on this provider's finished bookings.
 * Throws when it can't be read; there is no placeholder rating.
 */
export async function fetchSpReviewsSummaryLive(): Promise<ServiceProviderReviewsSummary> {
  const { data, error } = await apiClient.get<{
    averageRating: number | null;
    totalCount: number;
    distribution: { stars: number; count: number }[];
    recent: Array<{
      id: string;
      rating: number;
      comment: string;
      createdAt: string;
      authorName: string;
      serviceName: string;
    }>;
  }>("/bookings/provider/reviews");
  if (error || !data) throw new Error(error?.message || "Could not load your reviews.");
  return {
    averageRating: data.averageRating,
    totalCount: data.totalCount,
    distribution: data.distribution,
    recent: data.recent.map((r) => ({ ...r, visible: true })),
  };
}
