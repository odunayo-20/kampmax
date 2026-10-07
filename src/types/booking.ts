// ============================================================
// SERVICE BOOKING & SCHEDULING DOMAIN TYPES  (Modules 18–19)
// ============================================================
//
// Backend-authoritative projections for the booking & scheduling module.
//
//   - Slots, prices, and every status transition are decided by the mock
//     "backend" (src/data/booking.ts). The UI only renders what the backend
//     returns — it NEVER computes availability from weekly hours.
//   - Mutations are idempotent: each create/reschedule carries an
//     `idempotencyKey` so retries after an ambiguous timeout cannot double-book.
//   - All timestamps are absolute ISO-8601 instants paired with an explicit
//     `timeZone` ("Africa/Lagos"). Slot wall-clock labels are derived from the
//     booking timezone, never from the viewer's device clock.
//   - Private phone numbers are only shown to the party who owns the booking
//     (customer on their booking, provider on theirs).

import type {
  ServiceProviderLocationType,
  ServiceProviderPricingModel,
} from "@/types/service-provider";

// ── Booking status (backend life-cycle) ───────────────────────

export type BookingStatus =
  | "pending" // request_approval provider — awaiting provider confirmation
  | "confirmed" // provider accepted, or instant booking confirmed automatically
  | "in_progress" // provider started the appointment
  | "completed" // appointment finished
  | "cancelled" // cancelled within policy (by either party)
  | "declined"; // provider declined a request_approval booking

export const BOOKING_STATUS_LABELS: Record<BookingStatus, string> = {
  pending: "Awaiting confirmation",
  confirmed: "Confirmed",
  in_progress: "In progress",
  completed: "Completed",
  cancelled: "Cancelled",
  declined: "Declined",
};

export const BOOKING_STATUS_SHORT_LABELS: Record<BookingStatus, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  in_progress: "In progress",
  completed: "Completed",
  cancelled: "Cancelled",
  declined: "Declined",
};

export type BookingStatusTone = "gold" | "green" | "blue" | "neutral" | "red" | "slate";

export const BOOKING_STATUS_TONE: Record<BookingStatus, BookingStatusTone> = {
  pending: "gold",
  confirmed: "green",
  in_progress: "blue",
  completed: "green",
  cancelled: "red",
  declined: "red",
};

/** Statuses that occupy a provider's calendar slot. */
export const ACTIVE_BOOKING_STATUSES: BookingStatus[] = [
  "pending",
  "confirmed",
  "in_progress",
];

// ── Timeline ──────────────────────────────────────────────────

export type BookingTimelineEventKind =
  | "created"
  | "accepted"
  | "declined"
  | "started"
  | "rescheduled"
  | "cancelled"
  | "completed"
  | "completion_confirmed"
  | "problem_reported"
  | "reviewed";

export interface BookingTimelineEvent {
  id: string;
  kind: BookingTimelineEventKind;
  title: string;
  message?: string;
  createdAt: string; // ISO-8601 (absolute instant)
}

// ── Location ──────────────────────────────────────────────────

export interface BookingLocation {
  /** How the appointment happens (backend-resolved from the service). */
  type: ServiceProviderLocationType;
  /** Display label, e.g. "Provider location · Engineering Block, RUGIPO". */
  label: string;
  /** Customer-supplied address for customer_location services. */
  address?: string;
}

// ── Price ─────────────────────────────────────────────────────

export interface BookingPrice {
  model: ServiceProviderPricingModel;
  /** The amount confirmed by the backend when the booking was created. */
  amount: number;
  amountMax?: number;
  /** Human-readable note (e.g. "Starting from — final cost set after inspection"). */
  note: string;
  /** Optional fee set by the provider when request_approval is accepted. */
  finalFeeLabel?: string;
}

// ── Booking (backend projection) ──────────────────────────────

export interface ServiceBooking {
  id: string; // "bkm_..."
  bookingReference: string; // "KM-XXXXXX"
  customerId: string;
  providerId: string;
  serviceId: string;
  /** Who the booking is with (the provider as customers know them). */
  provider?: { id: string; displayName: string; slug: string; userId: string };
  serviceName: string;
  serviceImageUrl?: string;
  status: BookingStatus;
  bookingPreference: "instant" | "request_approval";
  /** Absolute start instant (ISO-8601). */
  startAt: string;
  /** Absolute end instant (ISO-8601). */
  endAt: string;
  timeZone: string;
  durationMinutes: number;
  price: BookingPrice;
  location: BookingLocation;
  /** Customer contact — only exposed to the booking's parties. */
  customer: {
    name: string;
    phone: string;
    email?: string;
    campusId?: string;
  };
  notes?: string;
  cancellationPolicy: {
    freeUntilHours: number;
    message: string;
  };
  cancelledBy?: "customer" | "provider";
  declineReason?: string;
  createdAt: string;
  updatedAt: string;
  timeline: BookingTimelineEvent[];
  /** Order-fulfilment model (Module 19): completion confirmation, problems,
   * reviews, evidence, and payment/escrow readiness. Backend-owned. */
  fulfillment: BookingFulfillment;
}

// ── Fulfilment model (Module 19) ──────────────────────────────

/** Evidence file attached by a party. Uploaded client-side, but the actual
 * file lives / uploads with the real backend — never executed locally. */
export type BookingEvidenceKind = "image" | "document" | "other";

export interface BookingEvidence {
  id: string;
  kind: BookingEvidenceKind;
  name: string;
  mime: string;
  sizeBytes: number;
  /** In-memory preview (client-held until a secure backend upload exists). */
  dataUrl?: string;
}

export type FulfillmentConfirmationStatus =
  | "not_required" // category rule: no customer gate after completion
  | "awaiting" // provider completed; customer must confirm
  | "confirmed" // customer confirmed completion
  | "problem_reported"; // customer reported an issue; handed to support

export type ServiceProblemCategory =
  | "service_not_completed"
  | "service_incomplete"
  | "quality_issue"
  | "provider_no_show"
  | "wrong_service"
  | "other";

export interface BookingProblem {
  category: ServiceProblemCategory;
  description: string;
  evidence?: BookingEvidence[];
  reportedAt: string;
  /** Dispute handoff — the resolution flow opens in a later module. */
  assignedTo: "kampmax_support";
}

export interface BookingReviewInput {
  rating: 1 | 2 | 3 | 4 | 5;
  title?: string;
  body?: string;
}

export interface BookingReview extends BookingReviewInput {
  id: string;
  submittedAt: string;
}

export type BookingPaymentState =
  | "not_required"
  | "unpaid"
  | "paid"
  | "escrow_held"
  | "release_pending"
  | "released"
  | "refund_pending"
  | "refunded";

export type BookingEscrowState =
  | "not_available"
  | "held"
  | "release_pending"
  | "released"
  | "refund_pending"
  | "refunded"
  | "disputed";

/** Illustrative settlement computed by the backend AFTER a completed booking
 * is confirmed. Read-only readiness display — no money is moved. */
export interface BookingSettlementBreakdown {
  currency: "NGN";
  serviceAmount: number;
  platformFee: number;
  platformFeeRate: number;
  providerEarnings: number;
  tax: number;
  feeLabel: string;
  computedAt: string;
  disclaimer: string;
}

export interface BookingRescheduleHistoryEntry {
  originalStartAt: string;
  originalEndAt: string;
  rescheduledAt: string;
}

export interface BookingFulfillment {
  /** Backend category rule: subjective services require the customer to confirm. */
  requiresCompletionConfirmation: boolean;
  /** Backend category rule: provider may attach proof when completing. */
  allowCompletionEvidence: boolean;
  completionEvidence?: BookingEvidence[];
  confirmationStatus: FulfillmentConfirmationStatus;
  customerConfirmedAt?: string;
  problem?: BookingProblem;
  review?: BookingReview;
  /** Reviews open within this window (booking-timezone days; backend-set). */
  reviewEligibleUntil?: string;
  /** Readiness projections — this module never moves money. */
  payment: { state: BookingPaymentState; label: string };
  escrow: { state: BookingEscrowState; label: string };
  settlement?: BookingSettlementBreakdown;
  startedAt?: string;
  completedAt?: string;
  /** Latest completed reschedule; the timeline keeps the full history. */
  reschedule?: BookingRescheduleHistoryEntry;
  /** Outcome flags are backend/admin-assigned only (late / no-show). */
  outcomeFlags?: {
    providerLate?: boolean;
    customerLate?: boolean;
    providerNoShow?: boolean;
    customerNoShow?: boolean;
  };
}

// ── Availability (backend-authoritative slots) ────────────────

export type BookingDayUnavailableReason =
  | "past"
  | "closed"
  | "advance_notice"
  | "too_far"
  | "fully_booked"
  | "none";

export interface BookingSlot {
  /** Wall-clock start in the service timezone ("HH:mm"). */
  startTime: string;
  /** Wall-clock end in the service timezone ("HH:mm"). */
  endTime: string;
  /** Absolute start instant (ISO-8601). */
  startAt: string;
  durationMinutes: number;
  taken: boolean;
  /** Why a slot is unavailable (e.g. "already booked", "too late to book"). */
  reason?: string;
}

export interface DayAvailability {
  /** Date key in the service timezone ("YYYY-MM-DD"). */
  date: string;
  /** Short label: "Today", "Tomorrow", or "Sat 13 Feb". */
  label: string;
  /** Full label: "Saturday, 13 February 2026". */
  fullLabel: string;
  /** 0 = Monday ... 6 = Sunday in the service timezone. */
  weekday: number;
  available: boolean;
  reason: BookingDayUnavailableReason;
  reasonLabel?: string;
  timeZone: string;
  slots: BookingSlot[];
}

export interface BookingAvailabilityResponse {
  serviceId: string;
  providerId: string;
  serviceName: string;
  /** The provider as customers know them. */
  providerName: string;
  serviceImageUrl?: string;
  bookingPreference: "instant" | "request_approval";
  bookingPreferenceLabel: string;
  durationMinutes: number;
  locationType: ServiceProviderLocationType;
  locationLabel: string;
  price: BookingPrice;
  minAdvanceHours: number;
  maxAdvanceDays: number;
  timeZone: string;
  days: DayAvailability[];
}

// ── Create booking ────────────────────────────────────────────

export interface CreateBookingInput {
  serviceId: string;
  startAt: string; // ISO-8601 absolute instant
  locationType: ServiceProviderLocationType;
  address?: string;
  notes?: string;
  customerPhone: string;
  idempotencyKey: string;
}

// ── Cancellation / reschedule ─────────────────────────────────

export interface CancelBookingInput {
  id: string;
  reason?: string;
  cancelledBy: "customer" | "provider";
}

export interface RescheduleBookingInput {
  id: string;
  startAt: string; // ISO-8601 absolute instant
  idempotencyKey: string;
}

// ── Provider actions ──────────────────────────────────────────

export interface ProviderBookingDecision {
  id: string;
  /** Final fee set when accepting (overrides starting_from price). */
  finalFee?: number;
  reason?: string;
}

// ── Errors ────────────────────────────────────────────────────

export type BookingErrorCode =
  | "401" // unauthenticated
  | "403" // not the owner / not permitted
  | "404" // missing service or booking
  | "409" // slot no longer available (race) — recoverable
  | "422" // validation / policy
  | "429" // rate limited
  | "500" // internal
  | "timeout"; // ambiguous result — safe to check status

export interface BookingError {
  code: BookingErrorCode;
  message: string;
  field?: string;
  /** True when the caller may retry (e.g. pick a new slot after 409). */
  recoverable?: boolean;
  /** Suggest nearby free slots after a 409. */
  suggestedSlots?: string[];
}

export type BookingResult =
  | { ok: true; booking: ServiceBooking; alreadyExisted?: boolean }
  | { ok: false; error: BookingError };

// ── List filters ──────────────────────────────────────────────

/** Customer-side list tabs (superset covers the provider dashboard too). */
export type BookingListFilter =
  | "upcoming"
  | "in_progress"
  | "completed"
  | "past"
  | "cancelled"
  | "all";

export type ProviderBookingStatusFilter = "pending" | BookingListFilter;

export type BookingSort = "newest" | "oldest" | "upcoming" | "recently_completed";

export interface BookingListQuery {
  status?: BookingListFilter | ProviderBookingStatusFilter;
  /** Free text across service name, reference, and party names. */
  search?: string;
  serviceId?: string;
  providerId?: string;
  /** Inclusive date window in the booking timezone ("YYYY-MM-DD"). */
  dateFrom?: string;
  dateTo?: string;
  sort?: BookingSort;
  page?: number;
  limit?: number;
}

export interface BookingPageResult {
  items: ServiceBooking[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// ── Ready states (payment/escrow/review spelled out below) ──

export type BookingPaymentStage =
  | "not_required"
  | "not_started"
  | "pending"
  | "settled";

export interface BookingReadyState {
  paymentStage: BookingPaymentStage;
  paymentLabel: string;
  requiresProviderApproval: boolean;
  canCancel: boolean;
  canReschedule: boolean;
  canReview: boolean;
  /** Customer may drive the post-completion gate. */
  canConfirmCompletion: boolean;
  canReportProblem: boolean;
  confirmationStatus: FulfillmentConfirmationStatus;
  cancelBlockedReason?: string;
}