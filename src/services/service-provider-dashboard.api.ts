// ============================================================
// SERVICE PROVIDER DASHBOARD — LIVE API IMPLEMENTATION
//
// Calls the real NestJS backend service-provider + analytics endpoints:
//   profile          → GET/PATCH /service-provider/profile/me
//   services         → GET/POST/PATCH /service-provider/services
//   availability     → GET/POST/PATCH /service-provider/availability
//   bookings         → GET /bookings/provider
//   analytics        → GET /analytics/service-provider
//   booking status   → GET /analytics/service-provider/bookings/status
// ============================================================

import { apiClient } from "@/lib/api-client";
import { campusIdOrUndefined, onlyCampusIds } from "@/lib/campus-id";
import type { BookingPreference, Slot } from "@/lib/provider-hours";
import { makeSlug } from "@/lib/service-form";
import type {
  ServiceProviderDashboardRecord,
  ServiceProviderDashboardService,
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
  /** Campuses this provider serves; where their services appear. */
  primaryCampusId?: string | null;
  additionalCampusIds?: string[] | null;
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
  /** Public address of the service's picture. */
  coverImageUrl?: string | null;
  /** More pictures after the main one, in order. */
  galleryImages?: { mediaId: string; url: string }[] | null;
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
  [key: string]: unknown;
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
      return "hourly";
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
    case "hourly":
      return "HOURLY";
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

/** The provider only chooses draft, active or inactive; review states are set by Kampmax. */
function mapStatusToBackend(frontend: ServiceProviderServiceStatus): "DRAFT" | "ACTIVE" | "INACTIVE" {
  if (frontend === "active") return "ACTIVE";
  if (frontend === "inactive") return "INACTIVE";
  return "DRAFT";
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
    images: s.coverImageUrl ? [s.coverImageUrl] : [],
    gallery: s.galleryImages ?? [],
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
  analytics?: BackendSpAnalyticsOverview | null,
  ratings?: { average: number | null; count: number } | null
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
      primaryCampusId: profile.primaryCampusId ?? "",
      additionalCampusIds: profile.additionalCampusIds ?? [],
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
      // Ratings come from the reviews summary, never a placeholder.
      averageRating: ratings?.average ?? null,
      // Not tracked by the backend yet, so unknown (null) rather than a false 0.
      profileViews: typeof analytics?.profileViews === "number" ? analytics.profileViews : null,
    },
  };
}

// ============================================================
// LIVE API FUNCTIONS
// ============================================================

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
    /** null takes the main campus off the profile. */
    primaryCampusId: string | null;
    additionalCampusIds: string[];
    bookingPreference: "INSTANT" | "REQUEST_APPROVAL";
    minAdvanceNoticeHours: number;
    maxAdvanceBookingDays: number;
    bufferMinutes: number;
  }>
): Promise<{ ok: boolean; error?: string; status?: number; record?: ServiceProviderDashboardRecord }> {
  const payload: Record<string, unknown> = {};
  if (patch.displayName !== undefined) payload.displayName = patch.displayName.trim();
  if (patch.bio !== undefined) payload.bio = patch.bio.trim();
  if (patch.description !== undefined && !payload.bio) payload.bio = patch.description.trim();
  if (patch.yearsExperience !== undefined) payload.yearsOfExperience = patch.yearsExperience;
  if (patch.profileImageId !== undefined) payload.profileImageId = patch.profileImageId;
  if (patch.locationCity !== undefined) payload.locationCity = patch.locationCity;
  if (patch.locationState !== undefined) payload.locationState = patch.locationState;
  if (patch.serviceRadius !== undefined) payload.serviceRadius = patch.serviceRadius;
  if (patch.primaryCampusId !== undefined) {
    payload.primaryCampusId = patch.primaryCampusId === null ? null : campusIdOrUndefined(patch.primaryCampusId);
  }
  if (patch.additionalCampusIds !== undefined) payload.additionalCampusIds = onlyCampusIds(patch.additionalCampusIds);
  if (patch.bookingPreference !== undefined) payload.bookingPreference = patch.bookingPreference;
  if (patch.minAdvanceNoticeHours !== undefined) payload.minAdvanceNoticeHours = patch.minAdvanceNoticeHours;
  if (patch.maxAdvanceBookingDays !== undefined) payload.maxAdvanceBookingDays = patch.maxAdvanceBookingDays;
  if (patch.bufferMinutes !== undefined) payload.bufferMinutes = patch.bufferMinutes;

  const { data, error } = await apiClient.patch<Record<string, unknown>, BackendSpProfile>(
    "/service-provider/profile/me",
    payload
  );

  if (error || !data) {
    return { ok: false, error: error?.message || "Failed to update profile", status: error?.status };
  }

  const fullRecord = await fetchSpProfileRecordLive();
  return { ok: true, record: fullRecord };
}

/**
 * Fetches all services owned by current provider from live backend.
 */
export async function fetchSpServicesLive(): Promise<ServiceProviderDashboardService[]> {
  const res = await apiClient.get<BackendSpService[]>("/service-provider/services/me");
  // A failed load is an error, not "no services": an empty list would invite adding a first service.
  if (res.error || !res.data) throw new Error(res.error?.message || "Could not load your services.");
  return res.data.map(mapBackendService).sort((a, b) =>
    new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
}

/**
 * Creates a new service offering on the live backend.
 */
export async function addSpDashboardServiceLive(
  input: ServiceProviderServiceInput
): Promise<{ ok: boolean; service?: ServiceProviderDashboardService; error?: string; status?: number }> {
  if (!input.name.trim()) return { ok: false, error: "Service name is required." };
  if (!input.categoryId) return { ok: false, error: "Choose a category." };
  if (input.price < 0) return { ok: false, error: "Price must be zero or more." };
  if (input.durationMinutes <= 0) return { ok: false, error: "Duration must be positive." };

  // The form keeps one slug while the name is unchanged, so a retry cannot create a second copy.
  const slug = input.slug ?? makeSlug(input.name);

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
    ...(input.coverMediaId ? { coverMediaId: input.coverMediaId } : {}),
    ...(input.galleryMediaIds?.length ? { galleryMediaIds: input.galleryMediaIds } : {}),
    // Without this the server starts every service as a draft, whatever was chosen.
    ...(input.status ? { status: mapStatusToBackend(input.status) } : {}),
  };

  const { data, error } = await apiClient.post<Record<string, unknown>, BackendSpService>(
    "/service-provider/services",
    payload
  );

  if (error || !data || !data.id) {
    return { ok: false, error: error?.message || "Failed to create service", status: error?.status };
  }

  return { ok: true, service: mapBackendService(data) };
}

/**
 * Updates an existing service offering on the live backend.
 */
export async function updateSpDashboardServiceLive(
  serviceId: string,
  patch: Partial<ServiceProviderServiceInput>
): Promise<{ ok: boolean; error?: string; status?: number; service?: ServiceProviderDashboardService }> {
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
  if (patch.coverMediaId !== undefined) payload.coverMediaId = patch.coverMediaId;
  if (patch.galleryMediaIds !== undefined) payload.galleryMediaIds = patch.galleryMediaIds;

  const { data, error } = await apiClient.patch<Record<string, unknown>, BackendSpService>(
    `/service-provider/services/${serviceId}`,
    payload
  );

  if (error || !data || !data.id) {
    return { ok: false, error: error?.message || "Failed to update service", status: error?.status };
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
      primaryCampusId: profile?.primaryCampusId ?? "",
      additionalCampusIds: profile?.additionalCampusIds ?? [],
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

// ── Weekly hours and how bookings are taken ──────────────────

export interface SpHoursInput {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

type SpWrite = { ok: boolean; error?: string; status?: number };

async function writeHours(
  call: Promise<{ error: { message?: string; status?: number } | null }>
): Promise<SpWrite> {
  const { error } = await call;
  return error ? { ok: false, error: error.message, status: error.status } : { ok: true };
}

/** GET /service-provider/availability/me: only the active windows come back. Throws when it cannot load. */
export async function fetchSpHours(): Promise<Slot[]> {
  const { data, error } = await apiClient.get<BackendSpAvailabilitySlot[]>("/service-provider/availability/me");
  if (error || !data) throw new Error(error?.message || "Could not load your hours.");
  return data.map((s) => ({ id: s.id, dayOfWeek: s.dayOfWeek, startTime: s.startTime.slice(0, 5), endTime: s.endTime.slice(0, 5) }));
}

/** POST /service-provider/availability. The backend refuses a window that overlaps another. */
export function addSpHours(input: SpHoursInput): Promise<SpWrite> {
  return writeHours(apiClient.post("/service-provider/availability", { ...input, isActive: true }));
}

/** PATCH /service-provider/availability/:id with new times. */
export function updateSpHours(id: string, input: SpHoursInput): Promise<SpWrite> {
  return writeHours(apiClient.patch(`/service-provider/availability/${id}`, input));
}

/** There is no delete; switching a window off removes it from the list. */
export function removeSpHours(id: string): Promise<SpWrite> {
  return writeHours(apiClient.patch(`/service-provider/availability/${id}`, { isActive: false }));
}

export interface SpBookingSettings {
  bookingPreference: BookingPreference;
  minAdvanceNoticeHours: number;
  maxAdvanceBookingDays: number;
  bufferMinutes: number;
  primaryCampusId: string;
  additionalCampusIds: string[];
}

/** How bookings are taken and which campuses are served, from the profile. Throws when it cannot load. */
export async function fetchSpBookingSettings(): Promise<SpBookingSettings> {
  const { data, error } = await apiClient.get<BackendSpProfile>("/service-provider/profile/me");
  if (error || !data) throw new Error(error?.message || "Could not load your settings.");
  return {
    bookingPreference: data.bookingPreference === "INSTANT" ? "INSTANT" : "REQUEST_APPROVAL",
    minAdvanceNoticeHours: data.minAdvanceNoticeHours ?? 2,
    maxAdvanceBookingDays: data.maxAdvanceBookingDays ?? 30,
    bufferMinutes: data.bufferMinutes ?? 15,
    primaryCampusId: data.primaryCampusId ?? "",
    additionalCampusIds: data.additionalCampusIds ?? [],
  };
}

export interface SpProfileDetails {
  slug: string;
  displayName: string;
  bio: string;
  yearsOfExperience: number | null;
  locationCity: string;
  logoUrl: string | null;
  coverImageUrl: string | null;
  verification: ServiceProviderVerificationStatus;
  /** The backend's own word (PENDING, VERIFIED, SUSPENDED, DEACTIVATED), which says more than `verification`. */
  verificationStatus: string;
  primaryCampusId: string;
  additionalCampusIds: string[];
}

/** What the profile page shows and edits, from one request. Throws when it cannot load. */
export async function fetchSpProfileDetails(): Promise<SpProfileDetails> {
  const { data, error } = await apiClient.get<BackendSpProfile>("/service-provider/profile/me");
  if (error || !data) throw new Error(error?.message || "Could not load your profile.");
  return {
    slug: data.slug,
    displayName: data.displayName,
    bio: data.bio ?? "",
    yearsOfExperience: data.yearsOfExperience ?? null,
    locationCity: data.locationCity ?? "",
    logoUrl: data.logoUrl ?? null,
    coverImageUrl: data.coverImageUrl ?? null,
    verification: mapVerificationStatusToFrontend(data.verificationStatus),
    verificationStatus: data.verificationStatus,
    primaryCampusId: data.primaryCampusId ?? "",
    additionalCampusIds: data.additionalCampusIds ?? [],
  };
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
      title?: string;
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
    recent: data.recent,
  };
}
