// ============================================================
// SERVICE ORDER (BOOKING) CENTRALIZED CONFIGURATION  (Module 19)
// ============================================================
//
// Single source of truth for order-fulfillment presentation constants
// shared by the booking engine and its UI. Keeps status-table nuances,
// labels, tones, category rules, and upload limits in one place so
// components and the backend store never hard-code presentation values.
//
// ARCHITECTURE & SECURITY:
//   - This file is presentation/rule metadata ONLY. Status transitions are
//     ALWAYS decided by the backend store (src/data/booking.ts). The UI may
//     hide or disable actions based on these constants, but never mutates a
//     status directly.
//   - Category rules (which services require completion confirmation or
//     allow completion evidence) live here so the backend store and the UI
//     agree by construction.

import type {
  BookingEscrowState,
  BookingEvidenceKind,
  BookingPaymentState,
  FulfillmentConfirmationStatus,
  ServiceProblemCategory,
} from "@/types/booking";

// ── Order lifecycle (backend-supported vs reserved) ───────────

/** Statuses the current backend actually implements. */
export const SERVICE_ORDER_STATUSES = [
  "pending",
  "confirmed",
  "in_progress",
  "completed",
  "cancelled",
  "declined",
] as const;

/** Real statuses a later backend will ship. The frontend understands them
 * defensively but treats them as unsupported: attempting one is a backend
 * schema problem, never a UI choice. */
export const SERVICE_ORDER_RESERVED_STATUSES = ["expired", "disputed"] as const;

export const SERVICE_ORDER_LIFECYCLE = {
  description: "Status flow owned by the backend store. The UI renders, never writes.",
  flow: [
    "pending -> confirmed (provider accepts) | declined (provider declines)",
    "confirmed -> in_progress (provider starts) | cancelled (policy check)",
    "in_progress -> completed (provider completes; optional evidence)",
    "completed -> confirmed complete (customer confirms) | issue reported (handed to support)",
  ],
  reserved: SERVICE_ORDER_RESERVED_STATUSES,
} as const;

// ── Completion confirmation (customer gate) ───────────────────

export const FULFILLMENT_CONFIRMATION_META: Record<
  FulfillmentConfirmationStatus,
  { label: string; tone: "neutral" | "info" | "positive" | "danger" }
> = {
  not_required: { label: "Auto-confirmed", tone: "neutral" },
  awaiting: { label: "Awaiting your confirmation", tone: "info" },
  confirmed: { label: "Confirmed complete", tone: "positive" },
  problem_reported: { label: "Issue reported", tone: "danger" },
};

export const CUSTOMER_CONFIRMATION_HEADING = "Has the service been completed?";
export const CUSTOMER_CONFIRMATION_BODY =
  "Confirm that the provider finished the appointment as booked. Confirming also opens the review window for this service.";

/** Subjective services must be confirmed by the customer before the order is
 * settled. Backend rule — also accessible for UI affordances. */
export const COMPLETION_CONFIRMATION_REQUIRED_CATEGORY_IDS = ["cat1", "cat8", "cat9"] as const;

/** Objective services: the provider may attach proof when completing. */
export const COMPLETION_EVIDENCE_ALLOWED_CATEGORY_IDS = ["cat3", "cat4", "cat5", "cat6"] as const;

// ── Review window ─────────────────────────────────────────────

/** Reviews stay open this many booking-timezone days after completion. */
export const REVIEW_WINDOW_DAYS = 14;

// ── Problem reporting (subjective services) ───────────────────

export const SERVICE_PROBLEM_CATEGORIES: {
  value: ServiceProblemCategory;
  label: string;
  description: string;
}[] = [
  {
    value: "service_not_completed",
    label: "Service not completed",
    description: "The provider did not perform the agreed service.",
  },
  {
    value: "service_incomplete",
    label: "Service incomplete",
    description: "Parts of the agreed service were missed or cut short.",
  },
  {
    value: "quality_issue",
    label: "Quality didn't match the booking",
    description: "The finish or outcome fell below what was agreed.",
  },
  {
    value: "provider_no_show",
    label: "Provider didn't show up",
    description: "The provider never arrived for the appointment.",
  },
  {
    value: "wrong_service",
    label: "Wrong service performed",
    description: "Something other than what was booked was done.",
  },
  {
    value: "other",
    label: "Something else",
    description: "Another issue with the completed service.",
  },
];

/** Issues on completed bookings go to Kampmax support, who settle the payment. */
export const PROBLEM_ASSIGNED_TO = "kampmax_support" as const;

// ── Payments & escrow ─────────────────────────────────────────

export const PAYMENT_STATE_LABELS: Record<BookingPaymentState, string> = {
  not_required: "No payment required",
  unpaid: "Payment scheduled",
  paid: "Payment received",
  escrow_held: "Held in escrow",
  release_pending: "Release pending",
  released: "Paid to provider",
  refund_pending: "Refund pending",
  refunded: "Refunded",
};

export const ESCROW_STATE_LABELS: Record<BookingEscrowState, string> = {
  not_available: "Escrow not connected",
  held: "Held in escrow",
  release_pending: "Release pending",
  released: "Released",
  refund_pending: "Refund pending",
  refunded: "Refunded",
  disputed: "Disputed",
};

export const SETTLEMENT_DISCLAIMER =
  "The provider is paid this amount once the customer confirms the service.";

/** Platform fee on a booking; kept in step with the backend. */
export const PLATFORM_FEE_RATE = 0.08;

// ── Evidence upload limits (validated client-side, backend-owned files) ──

export const EVIDENCE_KIND_LABELS: Record<BookingEvidenceKind, string> = {
  image: "Image",
  document: "Document",
  other: "File",
};

export const EVIDENCE_LIMITS = {
  maxFiles: 4,
  maxSizeBytes: 5 * 1024 * 1024,
  allowedKinds: ["image", "document", "other"] as BookingEvidenceKind[],
  allowedMimeByKind: {
    image: ["image/jpeg", "image/png", "image/webp"],
    document: ["application/pdf"],
    other: [],
  },
} as const;