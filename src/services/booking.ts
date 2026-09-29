import { apiClient } from "@/lib/api-client";
import type {
  BookingAvailabilityResponse,
  BookingEvidence,
  BookingListFilter,
  BookingListQuery,
  BookingPageResult,
  BookingPaymentStage,
  BookingReadyState,
  BookingResult,
  BookingReviewInput,
  FulfillmentConfirmationStatus,
  ProviderBookingStatusFilter,
  ServiceBooking,
  ServiceProblemCategory,
} from "@/types/booking";
import {
  BOOKING_STATUS_SHORT_LABELS,
} from "@/types/booking";
import {
  BOOKING_TIME_ZONE,
  acceptBookingOnBackend,
  cancelBookingOnBackend,
  completeBookingOnBackend,
  computeAvailabilityResponse,
  confirmCompletionOnBackend,
  createBookingOnBackend,
  declineBookingOnBackend,
  getBookingForCustomer,
  getBookingForProvider,
  getBookingsForCustomer,
  getBookingsForProvider,
  getProviderBookingStats,
  reportProblemOnBackend,
  rescheduleBookingOnBackend,
  resolveBookingLocation,
  startBookingOnBackend,
  submitBookingReviewOnBackend,
} from "@/data/booking";
import { getMarketplaceProvider, getServiceDetail } from "@/services/service-marketplace";
import { getCurrentUser } from "@/services/users";
import { getSpProfileRecord, pushSpBookingNotification, recordSpBookingActivity } from "@/services/service-provider-dashboard";
import { pushUserNotification } from "@/services/notifications";
import type {
  CancelBookingInput,
  CreateBookingInput,
  ProviderBookingDecision,
  RescheduleBookingInput,
} from "@/types/booking";
import type { ServiceProviderLocationType } from "@/types/service-provider";

// ── Availability ──────────────────────────────────────────────

export function getBookingAvailability(serviceId: string): BookingAvailabilityResponse | null {
  return computeAvailabilityResponse(serviceId);
}

/** Detail bundle used by the booking flow (availability + public catalog). */
export function getBookingPageBundle(serviceId: string) {
  const detail = getServiceDetail(serviceId);
  if (!detail) return null;
  const availability = computeAvailabilityResponse(serviceId);
  if (!availability) return null;
  return { ...detail, availability };
}

// ── Location options (backend-resolved from the service type) ─

export interface BookingLocationOption {
  type: ServiceProviderLocationType;
  label: string;
  description: string;
}

export function getBookingLocationOptions(
  locationType: ServiceProviderLocationType
): BookingLocationOption[] {
  switch (locationType) {
    case "online":
      return [{ type: "online", label: "Online session", description: "Remote — no travel needed." }];
    case "provider_location":
      return [{ type: "provider_location", label: "At the provider's location", description: "Visit the provider in person." }];
    case "customer_location":
      return [{ type: "customer_location", label: "At your location", description: "The provider comes to you (within campus/service area)." }];
    case "flexible":
      return [{ type: "flexible", label: "Flexible", description: "Agree a convenient spot with the provider." }];
    case "both":
    default:
      return [
        { type: "provider_location", label: "At the provider's location", description: "Visit the provider in person." },
        { type: "customer_location", label: "At your location", description: "The provider comes to you." },
        { type: "online", label: "Online session", description: "Remote — no travel needed." },
      ];
  }
}

// ── Create booking ────────────────────────────────────────────

export function createBooking(input: CreateBookingInput): BookingResult {
  const user = getCurrentUser();
  const detail = getServiceDetail(input.serviceId);
  if (!detail) {
    return {
      ok: false,
      error: { code: "404", message: "This service is not available for booking." },
    };
  }
  const availability = computeAvailabilityResponse(input.serviceId);
  if (!availability) {
    return {
      ok: false,
      error: {
        code: "422",
        message: "This service can't be booked online. Request a quote instead.",
        recoverable: false,
      },
    };
  }

  const result = createBookingOnBackend(
    {
      serviceId: availability.serviceId,
      providerId: availability.providerId,
      startAt: input.startAt,
      durationMinutes: availability.durationMinutes,
      price: availability.price,
      location: resolveBookingLocation(detail.service, input.locationType, input.address),
      bookingPreference: availability.bookingPreference,
      customerId: user.id,
      customerName: user.name,
      customerPhone: input.customerPhone || user.phone,
      customerEmail: user.email,
      campusId: user.campusId,
      notes: input.notes,
      idempotencyKey: input.idempotencyKey,
    },
    Date.now()
  );

  if (result.ok) {
    emitCreateNotifications(result.booking);
  }
  return result;
}

function emitCreateNotifications(booking: ServiceBooking): void {
  const instant = booking.bookingPreference === "instant";
  pushUserNotification({
    userId: booking.customerId,
    type: "booking_update",
    category: "bookings",
    title: instant ? "Booking confirmed" : "Booking request sent",
    message: instant
      ? `Your ${booking.serviceName} booking for ${bookingStartLabel(booking)} is confirmed.`
      : `${booking.serviceName} — the provider will confirm your ${bookingStartLabel(booking)} request shortly.`,
    actionUrl: `/customer/bookings/${booking.id}`,
  });
  pushSpBookingNotification(
    "New booking request",
    `${booking.customer.name} · ${booking.serviceName} · ${bookingStartLabel(booking)}`,
    `/service-provider/bookings/${booking.id}`
  );
  recordSpBookingActivity(
    "New booking request",
    `${booking.customer.name} requested ${booking.serviceName} for ${bookingStartLabel(booking)}.`,
    `/service-provider/bookings/${booking.id}`
  );
}

// ── Cancellation / reschedule (customer) ──────────────────────

export function cancelBooking(input: CancelBookingInput): BookingResult {
  const result = cancelBookingOnBackend(input, { customerId: getCurrentUser().id }, Date.now());
  if (result.ok) {
    const b = result.booking;
    if (input.cancelledBy === "customer") {
      pushSpBookingNotification(
        "Booking cancelled",
        `${b.customer.name} cancelled ${b.serviceName} (${bookingStartLabel(b)}).`,
        `/service-provider/bookings/${b.id}`
      );
      recordSpBookingActivity(
        "Booking cancelled",
        `${b.customer.name} cancelled ${b.serviceName} for ${bookingStartLabel(b)}.`,
        `/service-provider/bookings/${b.id}`
      );
    } else {
      pushUserNotification({
        userId: b.customerId,
        type: "booking_update",
        category: "bookings",
        title: "Booking cancelled",
        message: `The provider cancelled ${b.serviceName} for ${bookingStartLabel(b)}. ${input.reason ?? ""}`.trim(),
        actionUrl: `/customer/bookings/${b.id}`,
      });
    }
  }
  return result;
}

export function rescheduleBooking(input: RescheduleBookingInput): BookingResult {
  const result = rescheduleBookingOnBackend(
    input,
    { customerId: getCurrentUser().id },
    Date.now()
  );
  if (result.ok && !result.alreadyExisted) {
    const b = result.booking;
    pushUserNotification({
      userId: b.customerId,
      type: "booking_update",
      category: "bookings",
      title: "Booking rescheduled",
      message: `${b.serviceName} moved to ${bookingStartLabel(b)}.`,
      actionUrl: `/customer/bookings/${b.id}`,
    });
    pushSpBookingNotification(
      "Booking rescheduled",
      `${b.customer.name} moved ${b.serviceName} to ${bookingStartLabel(b)}.`,
      `/service-provider/bookings/${b.id}`
    );
    recordSpBookingActivity(
      "Booking rescheduled",
      `${b.customer.name} rescheduled ${b.serviceName} to ${bookingStartLabel(b)}.`,
      `/service-provider/bookings/${b.id}`
    );
  }
  return result;
}

// ── Provider decisions ────────────────────────────────────────

function providerOwner(): { providerId: string } | null {
  const profile = getSpProfileRecord();
  if (!profile) return null;
  return { providerId: profile.providerId };
}

export function acceptBooking(input: ProviderBookingDecision): BookingResult {
  const owner = providerOwner();
  if (!owner) {
    return { ok: false, error: { code: "403", message: "You don't have a service provider dashboard for this booking." } };
  }
  const result = acceptBookingOnBackend(input, owner, Date.now());
  if (result.ok && !result.alreadyExisted) {
    const b = result.booking;
    pushUserNotification({
      userId: b.customerId,
      type: "booking_update",
      category: "bookings",
      title: "Booking confirmed",
      message: `Your ${b.serviceName} booking for ${bookingStartLabel(b)} was confirmed by the provider.`,
      actionUrl: `/customer/bookings/${b.id}`,
    });
  }
  return result;
}

export function declineBooking(input: ProviderBookingDecision): BookingResult {
  const owner = providerOwner();
  if (!owner) {
    return { ok: false, error: { code: "403", message: "You don't have a service provider dashboard for this booking." } };
  }
  const result = declineBookingOnBackend(input, owner, Date.now());
  if (result.ok) {
    const b = result.booking;
    pushUserNotification({
      userId: b.customerId,
      type: "booking_update",
      category: "bookings",
      title: "Booking declined",
      message: `${b.serviceName} for ${bookingStartLabel(b)} was declined. ${input.reason ?? ""}`.trim(),
      actionUrl: `/customer/bookings/${b.id}`,
    });
  }
  return result;
}

export function startBooking(id: string): BookingResult {
  const owner = providerOwner();
  if (!owner) {
    return { ok: false, error: { code: "403", message: "You don't have a service provider dashboard for this booking." } };
  }
  const result = startBookingOnBackend(id, owner, Date.now());
  if (result.ok && !result.alreadyExisted) {
    const b = result.booking;
    pushUserNotification({
      userId: b.customerId,
      type: "booking_update",
      category: "bookings",
      title: "Appointment started",
      message: `Your ${b.serviceName} appointment has started.`,
      actionUrl: `/customer/bookings/${b.id}`,
    });
  }
  return result;
}

export function completeBooking(id: string, evidence?: BookingEvidence[]): BookingResult {
  const owner = providerOwner();
  if (!owner) {
    return { ok: false, error: { code: "403", message: "You don't have a service provider dashboard for this booking." } };
  }
  const result = completeBookingOnBackend(id, owner, { evidence }, Date.now());
  if (result.ok && !result.alreadyExisted) {
    const b = result.booking;
    const awaiting = b.fulfillment.confirmationStatus === "awaiting";
    pushUserNotification({
      userId: b.customerId,
      type: "booking_update",
      category: "bookings",
      title: awaiting ? "Service completed — please confirm" : "Service completed",
      message: awaiting
        ? `Your ${b.serviceName} appointment is complete. Confirm the service to close your order.`
        : `Your ${b.serviceName} appointment has been completed.`,
      actionUrl: `/customer/bookings/${b.id}`,
    });
  }
  return result;
}

// ── Customer fulfilment actions (completion gate / review) ────

export function confirmBookingCompletion(bookingId: string): BookingResult {
  const result = confirmCompletionOnBackend(getCurrentUser().id, bookingId, Date.now());
  if (result.ok && !result.alreadyExisted) {
    const b = result.booking;
    pushSpBookingNotification(
      "Completion confirmed",
      `${b.customer.name} confirmed ${b.serviceName} was completed (${bookingStartLabel(b)}).`,
      `/service-provider/bookings/${b.id}`
    );
    recordSpBookingActivity(
      "Booking fulfilled",
      `${b.customer.name} confirmed ${b.serviceName} was completed. Settlement preview is now available.`,
      `/service-provider/bookings/${b.id}`
    );
  }
  return result;
}

export interface ReportBookingProblemInput {
  category: ServiceProblemCategory;
  description: string;
  evidence?: BookingEvidence[];
}

export function reportBookingProblem(bookingId: string, input: ReportBookingProblemInput): BookingResult {
  const result = reportProblemOnBackend(getCurrentUser().id, bookingId, input, Date.now());
  if (result.ok) {
    const b = result.booking;
    pushSpBookingNotification(
      "Issue reported",
      `${b.customer.name} reported an issue on ${b.serviceName}. It's being reviewed by Kampmax support.`,
      `/service-provider/bookings/${b.id}`
    );
    recordSpBookingActivity(
      "Issue reported",
      `${b.customer.name} reported an issue on ${b.serviceName} — handed to Kampmax support.`,
      `/service-provider/bookings/${b.id}`
    );
  }
  return result;
}

export function submitBookingReview(bookingId: string, input: BookingReviewInput): BookingResult {
  const result = submitBookingReviewOnBackend(getCurrentUser().id, bookingId, input, Date.now());
  if (result.ok) {
    const b = result.booking;
    pushSpBookingNotification(
      "New review received",
      `${b.customer.name} left a ${input.rating}-star review on ${b.serviceName}.`,
      `/service-provider/bookings/${b.id}`
    );
    recordSpBookingActivity(
      "New review received",
      `${b.customer.name} left a ${input.rating}-star review on ${b.serviceName}.`,
      `/service-provider/bookings/${b.id}`
    );
  }
  return result;
}

// ── Queries ───────────────────────────────────────────────────

const BOOKING_LIST_PAGE_SIZE = 12;

export function getCustomerBookings(query: BookingListQuery = {}): BookingPageResult {
  const result = getBookingsForCustomer(getCurrentUser().id, {
    page: 1,
    limit: BOOKING_LIST_PAGE_SIZE,
    ...query,
  });
  return result as BookingPageResult;
}

export function getCustomerBookingCounts(): Record<BookingListFilter, number> {
  const userId = getCurrentUser().id;
  const count = (status: BookingListFilter) =>
    (getBookingsForCustomer(userId, { status, page: 1, limit: 1 }) as BookingPageResult).total;
  return {
    upcoming: count("upcoming"),
    in_progress: count("in_progress"),
    completed: count("completed"),
    past: count("past"),
    cancelled: count("cancelled"),
    all: count("all"),
  };
}

export function getCustomerBooking(bookingId: string): ServiceBooking | null {
  return getBookingForCustomer(getCurrentUser().id, bookingId);
}

export type ProviderBookingFilter = ProviderBookingStatusFilter;

export function getProviderBookings(query: BookingListQuery = {}): BookingPageResult {
  const owner = providerOwner();
  if (!owner) return emptyResult();
  const result = getBookingsForProvider(owner.providerId, {
    page: 1,
    limit: BOOKING_LIST_PAGE_SIZE,
    ...query,
  });
  return result as BookingPageResult;
}

function emptyResult(): BookingPageResult {
  return { items: [], page: 1, limit: BOOKING_LIST_PAGE_SIZE, total: 0, totalPages: 1 };
}

export function getProviderBooking(bookingId: string): ServiceBooking | null {
  const owner = providerOwner();
  if (!owner) return null;
  return getBookingForProvider(owner.providerId, bookingId);
}

export function getProviderBookingSummary(): {
  pending: number;
  upcomingToday: number;
  upcoming: number;
  inProgress: number;
  completed: number;
  cancelled: number;
} | null {
  const owner = providerOwner();
  if (!owner) return null;
  return getProviderBookingStats(owner.providerId);
}

// ── Ready states (presentation logic; backend remains authoritative) ──

export function getBookingReadyState(booking: ServiceBooking): BookingReadyState {
  const nowMs = Date.now();
  const startMs = new Date(booking.startAt).getTime();
  const active = booking.status === "pending" || booking.status === "confirmed" || booking.status === "in_progress";
  const f = booking.fulfillment;
  const done = booking.status === "completed";
  const reviewClosed =
    done && !!f.reviewEligibleUntil && new Date(f.reviewEligibleUntil).getTime() < nowMs;

  let paymentStage: BookingPaymentStage = "not_started";
  if (f.payment.state === "not_required") paymentStage = "not_required";
  else if (f.payment.state === "paid") paymentStage = "settled";
  else if (!!f.payment.state && f.payment.state !== "unpaid") paymentStage = "pending";
  else if (done) paymentStage = "pending";

  return {
    paymentStage,
    paymentLabel: f?.payment?.label ?? "Payment & escrow open in a later module — no charge yet.",
    requiresProviderApproval: booking.bookingPreference === "request_approval" && booking.status === "pending",
    canCancel: active && startMs > nowMs,
    canReschedule: (booking.status === "pending" || booking.status === "confirmed") && startMs > nowMs,
    canReview: done && f.confirmationStatus === "confirmed" && !f.review && !reviewClosed,
    canConfirmCompletion:
      done && f.requiresCompletionConfirmation && f.confirmationStatus === "awaiting",
    canReportProblem:
      done && f.confirmationStatus !== "confirmed" && f.confirmationStatus !== "problem_reported",
    confirmationStatus: f?.confirmationStatus ?? ("not_required" as FulfillmentConfirmationStatus),
  };
}

// ── Formatting helpers (timezone-authoritative display labels) ──

const dayFormatter = new Intl.DateTimeFormat("en-NG", {
  weekday: "short",
  day: "numeric",
  month: "short",
  timeZone: BOOKING_TIME_ZONE,
});
const timeFormatter = new Intl.DateTimeFormat("en-NG", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: BOOKING_TIME_ZONE,
});
const dateTimeFormatter = new Intl.DateTimeFormat("en-NG", {
  weekday: "short",
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: BOOKING_TIME_ZONE,
});

/** "Sat 13 Feb" */
export function formatBookingDay(isoMs: number | string): string {
  const ms = typeof isoMs === "string" ? new Date(isoMs).getTime() : isoMs;
  return dayFormatter.format(ms);
}

/** "Sat 13 Feb 2026" */
export function formatBookingDate(isoMs: number | string): string {
  const ms = typeof isoMs === "string" ? new Date(isoMs).getTime() : isoMs;
  return dateTimeFormatter.format(ms);
}

/** "09:30" (booking timezone) */
export function formatBookingTime(isoMs: number | string): string {
  const ms = typeof isoMs === "string" ? new Date(isoMs).getTime() : isoMs;
  return timeFormatter.format(ms);
}

/** "Sat 13 Feb · 09:30–10:30" */
export function bookingStartLabel(booking: Pick<ServiceBooking, "startAt" | "endAt" | "timeZone">): string {
  const startMs = new Date(booking.startAt).getTime();
  const endMs = new Date(booking.endAt).getTime();
  return `${formatBookingDay(startMs)} · ${formatBookingTime(startMs)}–${formatBookingTime(endMs)}`;
}

export function bookingStatusLabel(status: ServiceBooking["status"]): string {
  return BOOKING_STATUS_SHORT_LABELS[status];
}

// ── Discovery convenience ─────────────────────────────────────

export function getBookingProviderCatalog(providerId: string) {
  return getMarketplaceProvider(providerId);
}

// ── Live Provider & Customer Booking API exports ────────────
export {
  fetchProviderBookingsLive,
  fetchProviderBookingByIdLive,
  acceptProviderBookingLive,
  rejectProviderBookingLive,
  fetchProviderBookingSummaryLive,
  fetchCustomerBookingsLive,
  fetchCustomerBookingByIdLive,
  createCustomerBookingLive,
  cancelCustomerBookingLive,
  confirmCustomerBookingCompletionLive,
  mapBackendBookingToFrontend,
  mapBackendBookingStatus,
} from "./service-provider-booking.api";