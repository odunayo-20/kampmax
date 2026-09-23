import { getCurrentUser } from "@/services/users";
import { apiClient } from "@/lib/api-client";
import { getSpProfileByUserId } from "@/data/service-provider";
import { ensureSpDashboardContext } from "@/data/service-provider-dashboard";
import { getProviderBookingStats } from "@/data/booking";
import {
  SERVICE_PROVIDER_SERVICE_STATUS,
  SERVICE_PROVIDER_VERIFICATION_STATUS,
} from "@/types/service-provider";
import type {
  ServiceProviderActivityEvent,
  ServiceProviderDashboardMetric,
  ServiceProviderDashboardPortfolioItem,
  ServiceProviderDashboardRecord,
  ServiceProviderDashboardService,
  ServiceProviderNotification,
  ServiceProviderPermissions,
  ServiceProviderPortfolioItemInput,
  ServiceProviderProfileCompletion,
  ServiceProviderProfileCompletionItem,
  ServiceProviderReviewsSummary,
  ServiceProviderServiceInput,
  ServiceProviderSettings,
} from "@/types/service-provider-dashboard";
import { SERVICE_PROVIDER_PERMISSIONS } from "@/types/service-provider-dashboard";
import type { ServiceProviderOnboardingStatus } from "@/types/service-provider";
import { getSpOnboardingStatus } from "@/services/service-provider";

// ============================================================
// SERVICE PROVIDER DASHBOARD SERVICE LAYER  (Module 16)
// ============================================================
//
// Maps 1:1 to a future backend API:
//   GET    /service-provider/dashboard             → overview + metrics + activity
//   GET    /service-provider/profile               → profile management
//   PATCH  /service-provider/profile               → update profile (re-verification rules)
//   GET    /service-provider/services              → service list
//   POST   /service-provider/services              → create service
//   PATCH  /service-provider/services/:id          → update service
//   POST   /service-provider/services/:id/activate → activate (backend-moderation aware)
//   POST   /service-provider/services/:id/deactivate
//   GET    /service-provider/availability          → weekly schedule + booking prefs
//   PATCH  /service-provider/availability
//   GET    /service-provider/portfolio
//   POST   /service-provider/portfolio
//   PATCH  /service-provider/portfolio/:id
//   POST   /service-provider/portfolio/:id/reorder
//   DELETE /service-provider/portfolio/:id
//   GET    /service-provider/reviews               → summary + recent reviews
//   GET    /service-provider/notifications
//   GET    /service-provider/settings
//   PATCH  /service-provider/settings
//
// AUTHORIZATION: ownership is ALWAYS derived from the authenticated identity
// (getCurrentUser().id). We never trust providerId / serviceId / portfolioId /
// userId supplied by the client. Every resource is keyed by owner.
//
// SECURITY: approval, verification, and service moderation are always
// backend-authoritative. This layer only reports state the backend returns and
// never exposes private address, documents, or raw server errors.

// ── Access gate ──────────────────────────────────────────────

export const SERVICE_PROVIDER_DASHBOARD_GATE = {
  APPROVED: "approved",
  PENDING_REVIEW: "pending_review",
  MORE_INFORMATION: "more_information",
  REJECTED: "rejected",
  SUSPENDED: "suspended",
  NO_PROVIDER: "no_provider",
} as const;

export type ServiceProviderDashboardGateKind =
  (typeof SERVICE_PROVIDER_DASHBOARD_GATE)[keyof typeof SERVICE_PROVIDER_DASHBOARD_GATE];

export interface ServiceProviderAccess {
  kind: ServiceProviderDashboardGateKind;
  status: ServiceProviderOnboardingStatus | null;
  canUseDashboard: boolean;
  message: string | null;
  displayName?: string;
  slug?: string;
}

export function getServiceProviderAccess(): ServiceProviderAccess {
  const user = getCurrentUser();
  const profile = getSpProfileByUserId(user.id);
  const status = getSpOnboardingStatus();

  if (!profile) {
    return {
      kind: SERVICE_PROVIDER_DASHBOARD_GATE.NO_PROVIDER,
      status: null,
      canUseDashboard: false,
      message: "You don't have a service provider profile yet.",
      displayName: user.name,
    };
  }

  const approved = {
    kind: SERVICE_PROVIDER_DASHBOARD_GATE.APPROVED,
    status: status ?? "APPROVED",
    canUseDashboard: true,
    message: null,
    displayName: profile.displayName,
    slug: profile.slug,
  };

  // Backend-authoritative moderation states take precedence. Only after those
  // are ruled out does the durable approved public record grant dashboard access.
  if (status === "SUSPENDED") {
    return {
      kind: SERVICE_PROVIDER_DASHBOARD_GATE.SUSPENDED,
      status,
      canUseDashboard: false,
      message: "Your service provider profile has been suspended.",
      displayName: profile.displayName,
      slug: profile.slug,
    };
  }
  if (status === "REJECTED") {
    return {
      kind: SERVICE_PROVIDER_DASHBOARD_GATE.REJECTED,
      status,
      canUseDashboard: false,
      message: "Your application was rejected. You can re-apply.",
      displayName: profile.displayName,
      slug: profile.slug,
    };
  }
  if (status === "PENDING_REVIEW") {
    return {
      kind: SERVICE_PROVIDER_DASHBOARD_GATE.PENDING_REVIEW,
      status,
      canUseDashboard: false,
      message: "Your application is under review.",
      displayName: profile.displayName,
      slug: profile.slug,
    };
  }
  if (status === "APPROVED" || profile.verified) {
    return approved;
  }

  return {
    kind: SERVICE_PROVIDER_DASHBOARD_GATE.MORE_INFORMATION,
    status,
    canUseDashboard: false,
    message: "Complete your application to activate your service provider profile.",
    displayName: profile.displayName,
    slug: profile.slug,
  };
}

/** Minimal shape actually returned by GET /service-provider/profile/me
 * (modules/service-provider). */
interface ServiceProviderBackendProfile {
  id: string;
  displayName: string;
  slug: string;
  isActive: boolean;
  verificationStatus: "PENDING" | "VERIFIED" | "SUSPENDED" | "DEACTIVATED";
  [key: string]: unknown;
}

/**
 * Determine dashboard access gate state from the live backend.
 *
 * Gate is profile EXISTENCE (+ isActive), not verificationStatus — nothing
 * on the backend blocks a PENDING (unverified) service provider from using
 * their dashboard; identity/business verification is a separate, optional
 * flow surfaced from the profile (/service-provider/verification), not an
 * onboarding or dashboard-access requirement. A 404 on GET
 * /service-provider/profile/me means the capability was never activated.
 */
export async function getServiceProviderDashboardAccessApi(): Promise<ServiceProviderAccess> {
  const { data, error } = await apiClient.get<ServiceProviderBackendProfile>(
    "/service-provider/profile/me"
  );

  if (error) {
    if (error.status === 404) {
      return {
        kind: SERVICE_PROVIDER_DASHBOARD_GATE.NO_PROVIDER,
        status: null,
        canUseDashboard: false,
        message: "You don't have a service provider profile yet.",
        displayName: getCurrentUser().name,
      };
    }
    throw error;
  }
  if (!data) {
    throw new Error("Unable to load service provider profile.");
  }

  if (!data.isActive || data.verificationStatus === "SUSPENDED" || data.verificationStatus === "DEACTIVATED") {
    return {
      kind: SERVICE_PROVIDER_DASHBOARD_GATE.SUSPENDED,
      status: "SUSPENDED",
      canUseDashboard: false,
      message: "Your service provider profile is currently unavailable.",
      displayName: data.displayName,
      slug: data.slug,
    };
  }

  return {
    kind: SERVICE_PROVIDER_DASHBOARD_GATE.APPROVED,
    status: "APPROVED",
    canUseDashboard: true,
    message: null,
    displayName: data.displayName,
    slug: data.slug,
  };
}

/** Presentation-only permission surface. Backend enforces; frontend controls visibility. */
export function getServiceProviderPermissions(): ServiceProviderPermissions {
  const access = getServiceProviderAccess();
  if (!access.canUseDashboard || access.kind !== SERVICE_PROVIDER_DASHBOARD_GATE.APPROVED) {
    return {
      ...SERVICE_PROVIDER_PERMISSIONS,
      profileEdit: false,
      servicesManage: false,
      availabilityManage: false,
      portfolioManage: false,
      settingsEdit: false,
    };
  }
  return { ...SERVICE_PROVIDER_PERMISSIONS };
}

// ── Owner-scoped helpers ─────────────────────────────────────

function ownerId(): string {
  // Authoritative ownership — never from the client.
  return getCurrentUser().id;
}

function hasDashboardAccess(): boolean {
  const access = getServiceProviderAccess();
  return access.canUseDashboard && access.kind === SERVICE_PROVIDER_DASHBOARD_GATE.APPROVED;
}

function ownerContext(): ServiceProviderDashboardRecord {
  if (!hasDashboardAccess()) {
    throw new Error("Service provider dashboard access not granted.");
  }
  return ensureSpDashboardContext(ownerId()).record;
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function touch(ctx: ServiceProviderDashboardRecord): void {
  ctx.updatedAt = new Date().toISOString();
}

/** Record a backend event in the owner's activity feed (cap keeps it tidy). */
function recordActivity(
  event: Omit<ServiceProviderActivityEvent, "id" | "createdAt">
): void {
  const ctx = ensureSpDashboardContext(ownerId());
  ctx.activity.unshift({
    ...event,
    id: `spa_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
    createdAt: new Date().toISOString(),
  });
  if (ctx.activity.length > 12) ctx.activity.length = 12;
}

function pushNotification(
  notification: Omit<ServiceProviderNotification, "id" | "createdAt" | "read">
): void {
  const ctx = ensureSpDashboardContext(ownerId());
  ctx.notifications.unshift({
    ...notification,
    id: `spn_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
    read: false,
    createdAt: new Date().toISOString(),
  });
  if (ctx.notifications.length > 20) ctx.notifications.length = 20;
}

/**
 * Booking module integration: notify the provider's dashboard feed when a
 * booking event happens (kind is always the booking topic).
 */
export function pushSpBookingNotification(title: string, body: string, href?: string): void {
  pushNotification({ kind: "booking_request", title, body, href });
}

/** Booking module integration: record a booking event on the dashboard activity feed. */
export function recordSpBookingActivity(title: string, message: string, href?: string): void {
  recordActivity({ kind: "booking_request", title, message, href });
}

/** Financials module integration: notify the provider's dashboard feed (payouts/account). */
export function pushSpFinancialNotification(title: string, body: string, href?: string): void {
  pushNotification({ kind: "financial_update", title, body, href });
}

/** Financials module integration: record a payout/earnings event on the activity feed. */
export function recordSpFinancialActivity(title: string, message: string, href?: string): void {
  recordActivity({ kind: "payout_update", title, message, href });
}

// ── Dashboard overview ───────────────────────────────────────

export function getSpDashboard(): {
  record: ServiceProviderDashboardRecord;
  metrics: ServiceProviderDashboardMetric[];
  activity: ServiceProviderActivityEvent[];
} | null {
  if (!hasDashboardAccess()) return null;
  const ctx = ownerContext();
  const bookingStats = getProviderBookingStats(ctx.providerId);
  const metrics: ServiceProviderDashboardMetric[] = [
    {
      key: "active_services",
      label: "Active Services",
      valueLabel: String(
        ctx.services.filter((s) => s.status === SERVICE_PROVIDER_SERVICE_STATUS.ACTIVE).length
      ),
      tone: "positive",
      sublabel: `${ctx.services.length} total`,
    },
    {
      key: "total_bookings",
      label: "Total Bookings",
      valueLabel: String(ctx.metrics.totalBookings),
      tone: "neutral",
    },
    {
      key: "upcoming_bookings",
      label: "Upcoming Bookings",
      valueLabel: String(bookingStats.upcoming),
      tone: "info",
      sublabel: bookingStats.pending
        ? `${bookingStats.pending} awaiting confirmation · ${bookingStats.upcomingToday} today`
        : `${bookingStats.upcomingToday} today`,
    },
    {
      key: "in_progress_bookings",
      label: "In Progress",
      valueLabel: String(bookingStats.inProgress),
      tone: "info",
      sublabel: `${bookingStats.completed} completed · ${bookingStats.cancelled} cancelled`,
    },
    {
      key: "average_rating",
      label: "Average Rating",
      valueLabel: ctx.metrics.averageRating.toFixed(1),
      tone: "gold",
      sublabel: "5-star scale",
    },
    {
      key: "profile_views",
      label: "Profile Views",
      valueLabel: String(ctx.metrics.profileViews),
      tone: "neutral",
      sublabel: "this month",
    },
  ];
  return {
    record: clone(ctx),
    metrics,
    activity: clone(ensureSpDashboardContext(ownerId()).activity),
  };
}

// ── Profile completion (backend-computed) ────────────────────

export function computeSpProfileCompletion(): ServiceProviderProfileCompletion {
  const ctx = ensureSpDashboardContext(ownerId()).record;
  const missing: ServiceProviderProfileCompletionItem[] = [];
  let percentage = 0;

  const displayNameOk = !!ctx.profile.displayName.trim();
  const bioOk = !!(ctx.profile.bio?.trim() || ctx.profile.description?.trim());
  const taglineOk = !!ctx.profile.tagline?.trim();

  if (displayNameOk && bioOk && taglineOk) {
    percentage += 30;
  } else {
    if (!displayNameOk) {
      missing.push({ key: "display_name", label: "Profile name", description: "Add your display name.", href: "/service-provider/profile" });
    }
    if (!bioOk) {
      missing.push({ key: "bio", label: "Profile description", description: "Tell customers about your experience.", href: "/service-provider/profile" });
    }
    if (!taglineOk) {
      missing.push({ key: "tagline", label: "Tagline", description: "Add a short tagline.", href: "/service-provider/profile" });
    }
  }

  const activeCount = ctx.services.filter((s) => s.status === SERVICE_PROVIDER_SERVICE_STATUS.ACTIVE).length;
  if (activeCount >= 3) {
    percentage += 20;
  } else if (activeCount >= 1) {
    percentage += 15;
    missing.push({ key: "more_services", label: "Additional service", description: "Add more services to improve discovery.", href: "/service-provider/services/new" });
  } else {
    missing.push({ key: "services", label: "Services", description: "Add at least one active service.", href: "/service-provider/services/new" });
  }

  if (ctx.availability.days.some((d) => d.isAvailable)) {
    percentage += 15;
  } else {
    missing.push({ key: "availability", label: "Availability", description: "Set your working hours so customers know when you're available.", href: "/service-provider/availability" });
  }

  if (ctx.location.primaryCampusId) {
    percentage += 10;
  } else {
    missing.push({ key: "location", label: "Service areas", description: "Set your primary campus and service areas.", href: "/service-provider/availability" });
  }

  if (ctx.portfolio.length >= 3) {
    percentage += 20;
  } else if (ctx.portfolio.length >= 1) {
    percentage += 15;
    missing.push({ key: "portfolio_more", label: "More portfolio samples", description: "Add work samples to build trust.", href: "/service-provider/portfolio" });
  } else {
    missing.push({ key: "portfolio", label: "Portfolio", description: "Show customers what you can do.", href: "/service-provider/portfolio" });
  }

  if (ctx.verification.status === SERVICE_PROVIDER_VERIFICATION_STATUS.APPROVED) {
    percentage += 5;
  } else {
    missing.push({ key: "verification", label: "Verification", description: "Complete verification to unlock the verified badge.", href: "/service-provider/profile" });
  }

  return { percentage: Math.min(100, percentage), missing };
}

// ── Profile management ───────────────────────────────────────

export interface SpProfileUpdateResult {
  ok: boolean;
  error?: string;
  /** Backend-decided: true when the change may need re-review. */
  mayRequireReview: boolean;
  record: ServiceProviderDashboardRecord | null;
}

/** Fields whose change may trigger re-verification (backend-enforced rule). */
const RE_REVIEW_FIELDS = ["displayName", "bio", "description", "yearsExperience"] as const;

export function getSpProfileRecord(): ServiceProviderDashboardRecord | null {
  if (!hasDashboardAccess()) return null;
  return clone(ownerContext());
}

export function updateSpProfile(
  patch: Partial<ServiceProviderDashboardRecord["profile"]>
): SpProfileUpdateResult {
  if (!hasDashboardAccess()) {
    return { ok: false, error: "You don't have permission to edit this profile.", mayRequireReview: false, record: null };
  }
  const ctx = ensureSpDashboardContext(ownerId()).record;

  const mayRequireReview = (Object.keys(patch) as string[]).some((key) =>
    (RE_REVIEW_FIELDS as readonly string[]).includes(key)
  );

  ctx.profile = { ...ctx.profile, ...patch };
  touch(ctx);
  recordActivity({
    kind: "service_updated",
    title: "Profile updated",
    message: mayRequireReview
      ? "Profile changes pending — some may require re-verification."
      : "Your profile information was updated.",
    href: "/service-provider/profile",
  });
  return { ok: true, mayRequireReview, record: clone(ctx) };
}

// ── Service management (backend-moderation aware) ────────────

export function getSpServices(): ServiceProviderDashboardService[] {
  const ctx = ensureSpDashboardContext(ownerId()).record;
  return clone(ctx.services).sort((a, b) =>
    new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
}

export function addSpDashboardService(input: ServiceProviderServiceInput): {
  ok: boolean;
  service?: ServiceProviderDashboardService;
  error?: string;
} {
  if (!hasDashboardAccess()) return { ok: false, error: "You don't have permission to manage services." };
  const ctx = ensureSpDashboardContext(ownerId()).record;

  if (!input.name.trim()) return { ok: false, error: "Service name is required." };
  if (!input.categoryId) return { ok: false, error: "Choose a category." };
  if (input.price < 0) return { ok: false, error: "Price must be zero or more." };
  if (input.durationMinutes <= 0) return { ok: false, error: "Duration must be positive." };

  const id = `svc_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
  const service: ServiceProviderDashboardService = {
    id,
    name: input.name.trim(),
    description: input.description.trim(),
    categoryId: input.categoryId,
    pricingModel: input.pricingModel,
    price: input.price,
    priceMax: input.priceMax,
    durationMinutes: input.durationMinutes,
    locationType: input.locationType,
    status: input.status ?? SERVICE_PROVIDER_SERVICE_STATUS.DRAFT,
    images: input.images,
    updatedAt: new Date().toISOString(),
  };
  ctx.services.push(service);
  touch(ctx);
  recordActivity({
    kind: "service_created",
    title: "Service created",
    message: `"${service.name}" was added.`,
    href: "/service-provider/services",
  });
  return { ok: true, service: clone(service) };
}

export function updateSpDashboardService(
  serviceId: string,
  patch: Partial<ServiceProviderServiceInput>
): { ok: boolean; error?: string; service?: ServiceProviderDashboardService } {
  if (!hasDashboardAccess()) return { ok: false, error: "You don't have permission to manage services." };
  const ctx = ensureSpDashboardContext(ownerId()).record;
  const idx = ctx.services.findIndex((s) => s.id === serviceId);
  if (idx === -1) return { ok: false, error: "Service not found." };

  if (patch.price !== undefined && patch.price < 0) return { ok: false, error: "Price must be zero or more." };
  if (patch.durationMinutes !== undefined && patch.durationMinutes <= 0) return { ok: false, error: "Duration must be positive." };

  const before = ctx.services[idx];
  ctx.services[idx] = {
    ...before,
    ...patch,
    id: before.id, // backend-owned; never overwritten from client
    name: patch.name?.trim() ?? before.name,
    description: patch.description?.trim() ?? before.description,
    updatedAt: new Date().toISOString(),
  };
  touch(ctx);
  recordActivity({
    kind: "service_updated",
    title: "Service updated",
    message: `"${ctx.services[idx].name}" was updated.`,
    href: "/service-provider/services",
  });
  return { ok: true, service: clone(ctx.services[idx]) };
}

export function removeSpDashboardService(serviceId: string): { ok: boolean; error?: string } {
  if (!hasDashboardAccess()) return { ok: false, error: "You don't have permission to manage services." };
  const ctx = ensureSpDashboardContext(ownerId()).record;
  const idx = ctx.services.findIndex((s) => s.id === serviceId);
  if (idx === -1) return { ok: false, error: "Service not found." };
  const [removed] = ctx.services.splice(idx, 1);
  touch(ctx);
  recordActivity({
    kind: "service_updated",
    title: "Service removed",
    message: `"${removed.name}" was removed.`,
    href: "/service-provider/services",
  });
  return { ok: true };
}

/**
 * Activate / deactivate a service. The provider submits the desired state; the
 * backend decides. A provider can never force-moderation or bypass a suspension.
 */
export function setSpDashboardServiceStatus(
  serviceId: string,
  status: "active" | "inactive"
): { ok: boolean; error?: string; service?: ServiceProviderDashboardService } {
  if (!hasDashboardAccess()) return { ok: false, error: "You don't have permission to manage services." };
  const ctx = ensureSpDashboardContext(ownerId()).record;
  const idx = ctx.services.findIndex((s) => s.id === serviceId);
  if (idx === -1) return { ok: false, error: "Service not found." };

  ctx.services[idx] = {
    ...ctx.services[idx],
    status,
    updatedAt: new Date().toISOString(),
  };
  touch(ctx);
  recordActivity({
    kind: status === "active" ? "service_activated" : "service_deactivated",
    title: status === "active" ? "Service activated" : "Service deactivated",
    message: `"${ctx.services[idx].name}" is ${status === "active" ? "now live" : "no longer live"}.`,
    href: "/service-provider/services",
  });
  return { ok: true, service: clone(ctx.services[idx]) };
}

// ── Availability & service areas ─────────────────────────────

export function getSpAvailability(): {
  availability: ServiceProviderDashboardRecord["availability"];
  pricing: ServiceProviderDashboardRecord["pricing"];
  location: ServiceProviderDashboardRecord["location"];
} | null {
  if (!hasDashboardAccess()) return null;
  const ctx = ownerContext();
  return {
    availability: clone(ctx.availability),
    pricing: clone(ctx.pricing),
    location: clone(ctx.location),
  };
}

export function updateSpAvailability(
  patch: Partial<ServiceProviderDashboardRecord["availability"]>
): { ok: boolean; error?: string } {
  if (!hasDashboardAccess()) return { ok: false, error: "You don't have permission to manage availability." };
  const ctx = ensureSpDashboardContext(ownerId()).record;
  ctx.availability = { ...ctx.availability, ...patch };
  touch(ctx);
  recordActivity({
    kind: "availability_updated",
    title: "Availability updated",
    message: "Your weekly schedule was saved.",
    href: "/service-provider/availability",
  });
  return { ok: true };
}

export function updateSpPricing(
  patch: Partial<ServiceProviderDashboardRecord["pricing"]>
): { ok: boolean; error?: string } {
  if (!hasDashboardAccess()) return { ok: false, error: "You don't have permission to manage pricing." };
  const ctx = ensureSpDashboardContext(ownerId()).record;
  if (patch.travelFee !== undefined && patch.travelFee < 0) return { ok: false, error: "Travel fee must be zero or more." };
  if (patch.emergencyFee !== undefined && patch.emergencyFee < 0) return { ok: false, error: "Emergency fee must be zero or more." };
  if (patch.weekendFee !== undefined && patch.weekendFee < 0) return { ok: false, error: "Weekend fee must be zero or more." };
  if (patch.minimumBookingQuantity !== undefined && patch.minimumBookingQuantity < 1) {
    return { ok: false, error: "Minimum booking quantity must be at least 1." };
  }
  ctx.pricing = { ...ctx.pricing, ...patch };
  touch(ctx);
  recordActivity({
    kind: "availability_updated",
    title: "Pricing updated",
    message: "Your fee settings were saved.",
    href: "/service-provider/availability",
  });
  return { ok: true };
}

export function updateSpLocation(
  patch: Partial<ServiceProviderDashboardRecord["location"]>
): { ok: boolean; error?: string } {
  if (!hasDashboardAccess()) return { ok: false, error: "You don't have permission to manage service areas." };
  const ctx = ensureSpDashboardContext(ownerId()).record;
  if (patch.serviceRadiusKm !== undefined && patch.serviceRadiusKm < 0) return { ok: false, error: "Service radius must be zero or more." };
  ctx.location = { ...ctx.location, ...patch };
  touch(ctx);
  recordActivity({
    kind: "service_updated",
    title: "Service areas updated",
    message: "Your service areas were saved.",
    href: "/service-provider/availability",
  });
  return { ok: true };
}

// ── Portfolio management ─────────────────────────────────────

export function getSpPortfolio(): ServiceProviderDashboardPortfolioItem[] {
  const ctx = ensureSpDashboardContext(ownerId()).record;
  return clone(ctx.portfolio);
}

export function addSpDashboardPortfolioItem(input: ServiceProviderPortfolioItemInput): {
  ok: boolean;
  item?: ServiceProviderDashboardPortfolioItem;
  error?: string;
} {
  if (!hasDashboardAccess()) return { ok: false, error: "You don't have permission to manage your portfolio." };
  const ctx = ensureSpDashboardContext(ownerId()).record;
  if (!input.title.trim()) return { ok: false, error: "Title is required." };

  const id = `port_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
  const item: ServiceProviderDashboardPortfolioItem = {
    id,
    image: input.image || `https://picsum.photos/seed/${id}/600/400`,
    title: input.title.trim(),
    description: input.description.trim(),
    categoryId: input.categoryId,
    visible: input.visible ?? true,
    createdAt: new Date().toISOString(),
  };
  ctx.portfolio.push(item);
  touch(ctx);
  recordActivity({
    kind: "portfolio_item_added",
    title: "Portfolio item added",
    message: `"${item.title}" added to your portfolio.`,
    href: "/service-provider/portfolio",
  });
  return { ok: true, item: clone(item) };
}

export function updateSpDashboardPortfolioItem(
  id: string,
  patch: Partial<Omit<ServiceProviderDashboardPortfolioItem, "id">>
): { ok: boolean; error?: string } {
  if (!hasDashboardAccess()) return { ok: false, error: "You don't have permission to manage your portfolio." };
  const ctx = ensureSpDashboardContext(ownerId()).record;
  const idx = ctx.portfolio.findIndex((p) => p.id === id);
  if (idx === -1) return { ok: false, error: "Portfolio item not found." };

  ctx.portfolio[idx] = { ...ctx.portfolio[idx], ...patch, id }; // id stays backend-owned
  touch(ctx);
  recordActivity({
    kind: "portfolio_item_updated",
    title: "Portfolio item updated",
    message: `"${ctx.portfolio[idx].title}" was updated.`,
    href: "/service-provider/portfolio",
  });
  return { ok: true };
}

export function removeSpDashboardPortfolioItem(id: string): { ok: boolean; error?: string } {
  if (!hasDashboardAccess()) return { ok: false, error: "You don't have permission to manage your portfolio." };
  const ctx = ensureSpDashboardContext(ownerId()).record;
  const idx = ctx.portfolio.findIndex((p) => p.id === id);
  if (idx === -1) return { ok: false, error: "Portfolio item not found." };
  ctx.portfolio.splice(idx, 1);
  touch(ctx);
  return { ok: true };
}

export function moveSpDashboardPortfolioItem(
  id: string,
  direction: "up" | "down"
): { ok: boolean; error?: string } {
  if (!hasDashboardAccess()) return { ok: false, error: "You don't have permission to manage your portfolio." };
  const ctx = ensureSpDashboardContext(ownerId()).record;
  const idx = ctx.portfolio.findIndex((p) => p.id === id);
  if (idx === -1) return { ok: false, error: "Portfolio item not found." };
  const to = direction === "up" ? idx - 1 : idx + 1;
  if (to < 0 || to >= ctx.portfolio.length) return { ok: false, error: "Nothing to reorder." };
  const [item] = ctx.portfolio.splice(idx, 1);
  ctx.portfolio.splice(to, 0, item);
  touch(ctx);
  return { ok: true };
}

/** Backend decides whether an item is publicly visible; provider requests a change. */
export function setSpDashboardPortfolioItemVisibility(
  id: string,
  visible: boolean
): { ok: boolean; error?: string } {
  if (!hasDashboardAccess()) return { ok: false, error: "You don't have permission to manage your portfolio." };
  const ctx = ensureSpDashboardContext(ownerId()).record;
  const idx = ctx.portfolio.findIndex((p) => p.id === id);
  if (idx === -1) return { ok: false, error: "Portfolio item not found." };
  ctx.portfolio[idx] = { ...ctx.portfolio[idx], visible };
  touch(ctx);
  return { ok: true };
}

// ── Reviews ──────────────────────────────────────────────────

export function getSpReviewsSummary(): ServiceProviderReviewsSummary {
  const ctx = ensureSpDashboardContext(ownerId());
  const visible = ctx.reviews.filter((r) => r.visible);
  const totalCount = visible.length;
  const averageRating =
    totalCount === 0 ? 0 : visible.reduce((sum, r) => sum + r.rating, 0) / totalCount;

  const distribution = [5, 4, 3, 2, 1].map((stars) => ({
    stars,
    count: visible.filter((r) => Math.round(r.rating) === stars).length,
  }));

  const recent = [...visible]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 10);

  return {
    averageRating: Math.round(averageRating * 10) / 10,
    totalCount,
    distribution,
    recent: clone(recent),
  };
}

// ── Settings ─────────────────────────────────────────────────

export function getSpSettings(): ServiceProviderSettings {
  const ctx = ensureSpDashboardContext(ownerId());
  return clone(ctx.settings);
}

export function updateSpSettings(patch: Partial<ServiceProviderSettings>): {
  ok: boolean;
  settings: ServiceProviderSettings;
  error?: string;
} {
  if (!hasDashboardAccess()) {
    const current = ensureSpDashboardContext(ownerId()).settings;
    return { ok: false, settings: clone(current), error: "You don't have permission to edit settings." };
  }
  const ctx = ensureSpDashboardContext(ownerId()).settings;
  const next: ServiceProviderSettings = {
    ...ctx,
    ...patch,
    notificationPreferences: { ...ctx.notificationPreferences, ...(patch.notificationPreferences ?? {}) },
    bookingPreferences: { ...ctx.bookingPreferences, ...(patch.bookingPreferences ?? {}) },
    contactPreferences: { ...ctx.contactPreferences, ...(patch.contactPreferences ?? {}) },
    serviceAreaPreferences: { ...ctx.serviceAreaPreferences, ...(patch.serviceAreaPreferences ?? {}) },
  };
  ensureSpDashboardContext(ownerId()).settings = next;
  return { ok: true, settings: clone(next) };
}

// ── Notifications (owner-scoped dashboard feed) ──────────────

export function getSpNotifications(): {
  items: ServiceProviderNotification[];
  unreadCount: number;
} {
  const ctx = ensureSpDashboardContext(ownerId());
  return {
    items: clone(ctx.notifications),
    unreadCount: ctx.notifications.filter((n) => !n.read).length,
  };
}

export function markSpNotificationsRead(all: boolean, id?: string): void {
  const ctx = ensureSpDashboardContext(ownerId());
  if (all) {
    ctx.notifications.forEach((n) => (n.read = true));
  } else if (id) {
    const item = ctx.notifications.find((n) => n.id === id);
    if (item && !item.read) item.read = true;
  }
}