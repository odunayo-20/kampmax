// ============================================================
// SERVICE PROVIDER BOOKINGS — LIVE API IMPLEMENTATION
//
// Calls the real NestJS backend service-provider booking endpoints:
//   list incoming    → GET /service-provider/bookings/me
//   accept booking   → POST /service-provider/bookings/:id/accept
//   reject booking   → POST /service-provider/bookings/:id/reject
//   booking status   → GET /analytics/service-provider/bookings/status
// ============================================================

import { apiClient } from "@/lib/api-client";
import type {
  BookingListQuery,
  BookingPageResult,
  BookingResult,
  BookingStatus,
  BookingTimelineEvent,
  ServiceBooking,
} from "@/types/booking";

export interface BackendBookingEntity {
  id: string;
  customerId: string;
  providerId: string;
  serviceId: string;
  scheduledDate: string | Date;
  scheduledTime: string;
  durationMinutes?: number | null;
  agreedPrice: string | number;
  customerNotes?: string | null;
  providerNotes?: string | null;
  status:
    | "PENDING"
    | "ACCEPTED"
    | "CONFIRMED"
    | "IN_PROGRESS"
    | "COMPLETED"
    | "REJECTED"
    | "CANCELLED"
    | "EXPIRED"
    | "DISPUTED";
  cancelledBy?: string | null;
  cancellationReason?: string | null;
  createdAt: string | Date;
  cancelledAt?: string | Date | null;
  customer?: {
    id: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    phoneNumber?: string;
  };
  provider?: {
    id: string;
    displayName?: string;
    slug?: string;
  };
  service?: {
    id: string;
    title?: string;
    basePrice?: number;
    durationMinutes?: number;
    pricingModel?: string;
    serviceLocationType?: string;
  };
}

export interface BackendBookingStatusCounts {
  pending?: number;
  accepted?: number;
  in_progress?: number;
  completed?: number;
  cancelled?: number;
  rejected?: number;
  [key: string]: number | undefined;
}

export function mapBackendBookingStatus(backendStatus: string): BookingStatus {
  switch (backendStatus?.toUpperCase()) {
    case "ACCEPTED":
    case "CONFIRMED":
      return "confirmed";
    case "IN_PROGRESS":
    case "DISPUTED":
      return "in_progress";
    case "COMPLETED":
      return "completed";
    case "REJECTED":
      return "declined";
    case "CANCELLED":
    case "EXPIRED":
      return "cancelled";
    case "PENDING":
    default:
      return "pending";
  }
}

export function mapBackendBookingToFrontend(b: BackendBookingEntity): ServiceBooking {
  const status = mapBackendBookingStatus(b.status);
  const dateStr =
    typeof b.scheduledDate === "string"
      ? b.scheduledDate.split("T")[0]
      : new Date(b.scheduledDate || Date.now()).toISOString().split("T")[0];
  const timeStr = (b.scheduledTime || "09:00").slice(0, 5);

  let startIso: string;
  try {
    const candidate = new Date(`${dateStr}T${timeStr}:00.000Z`);
    startIso = isNaN(candidate.getTime()) ? new Date().toISOString() : candidate.toISOString();
  } catch {
    startIso = new Date().toISOString();
  }

  const durationMinutes = b.durationMinutes || b.service?.durationMinutes || 60;
  const endIso = new Date(new Date(startIso).getTime() + durationMinutes * 60 * 1000).toISOString();

  const customerName =
    [b.customer?.firstName, b.customer?.lastName].filter(Boolean).join(" ") || "Student";
  const customerPhone = b.customer?.phone || b.customer?.phoneNumber || "+234 800 000 0000";

  const timeline: BookingTimelineEvent[] = [
    {
      id: `tl_req_${b.id}`,
      kind: "created",
      title: "Booking requested",
      message: b.customerNotes || "Customer submitted booking request",
      createdAt: typeof b.createdAt === "string" ? b.createdAt : new Date(b.createdAt || Date.now()).toISOString(),
    },
  ];

  if (status === "confirmed") {
    timeline.push({
      id: `tl_acc_${b.id}`,
      kind: "accepted",
      title: "Booking accepted",
      message: b.providerNotes || "Provider confirmed appointment",
      createdAt: typeof b.createdAt === "string" ? b.createdAt : new Date().toISOString(),
    });
  } else if (status === "declined") {
    timeline.push({
      id: `tl_dec_${b.id}`,
      kind: "declined",
      title: "Booking declined",
      message: b.providerNotes || b.cancellationReason || "Provider declined request",
      createdAt: typeof b.cancelledAt === "string" ? b.cancelledAt : new Date().toISOString(),
    });
  } else if (status === "cancelled") {
    timeline.push({
      id: `tl_can_${b.id}`,
      kind: "cancelled",
      title: "Booking cancelled",
      message: b.cancellationReason || "Appointment cancelled",
      createdAt: typeof b.cancelledAt === "string" ? b.cancelledAt : new Date().toISOString(),
    });
  } else if (status === "completed") {
    timeline.push({
      id: `tl_com_${b.id}`,
      kind: "completed",
      title: "Service completed",
      message: b.providerNotes || "Service successfully completed",
      createdAt: typeof b.createdAt === "string" ? b.createdAt : new Date().toISOString(),
    });
  }

  return {
    id: b.id,
    bookingReference: `KM-${b.id.slice(0, 6).toUpperCase()}`,
    customerId: b.customerId,
    providerId: b.providerId,
    serviceId: b.serviceId,
    serviceName: b.service?.title || "Service",
    status,
    bookingPreference: "request_approval",
    startAt: startIso,
    endAt: endIso,
    timeZone: "Africa/Lagos",
    durationMinutes,
    price: {
      model: "fixed",
      amount: Number(b.agreedPrice) || b.service?.basePrice || 0,
      note: "Confirmed booking price",
    },
    location: {
      type:
        b.service?.serviceLocationType === "OFF_CAMPUS"
          ? "customer_location"
          : b.service?.serviceLocationType === "REMOTE"
          ? "online"
          : "provider_location",
      label:
        b.service?.serviceLocationType === "OFF_CAMPUS"
          ? "Customer's location"
          : b.service?.serviceLocationType === "REMOTE"
          ? "Online session"
          : "Provider location",
    },
    customer: {
      name: customerName,
      phone: customerPhone,
      email: b.customer?.email,
    },
    notes: b.customerNotes ?? undefined,
    cancellationPolicy: {
      freeUntilHours: 2,
      message: "Free cancellation up to 2 hours before the appointment.",
    },
    cancelledBy: b.cancelledBy ? "provider" : undefined,
    declineReason: b.cancellationReason || b.providerNotes || undefined,
    createdAt: typeof b.createdAt === "string" ? b.createdAt : new Date(b.createdAt || Date.now()).toISOString(),
    updatedAt: typeof b.createdAt === "string" ? b.createdAt : new Date(b.createdAt || Date.now()).toISOString(),
    timeline,
    fulfillment: {
      requiresCompletionConfirmation: false,
      allowCompletionEvidence: true,
      confirmationStatus: status === "completed" ? "confirmed" : "not_required",
      payment: {
        state: "paid",
        label: "Escrow secured",
      },
      escrow: {
        state: status === "completed" ? "released" : "held",
        label: status === "completed" ? "Settled" : "Escrow secured",
      },
    },
  };
}

/**
 * Fetches bookings for the current provider from the live backend with client-side query matching.
 */
export async function fetchProviderBookingsLive(
  query: BookingListQuery = {}
): Promise<BookingPageResult> {
  const limit = query.limit || 12;
  const page = query.page || 1;

  const res = await apiClient.get<BackendBookingEntity[]>("/service-provider/bookings/me");
  if (res.error || !res.data) {
    return { items: [], page: 1, limit, total: 0, totalPages: 1 };
  }

  let items = res.data.map(mapBackendBookingToFrontend);

  // Status filtering
  if (query.status && query.status !== "all") {
    if (query.status === "upcoming") {
      items = items.filter((b) => b.status === "confirmed");
    } else if (query.status === "cancelled") {
      items = items.filter((b) => b.status === "cancelled" || b.status === "declined");
    } else {
      items = items.filter((b) => b.status === query.status);
    }
  }

  // Service filter
  if (query.serviceId) {
    items = items.filter((b) => b.serviceId === query.serviceId);
  }

  // Search filter
  if (query.search?.trim()) {
    const q = query.search.trim().toLowerCase();
    items = items.filter(
      (b) =>
        b.serviceName.toLowerCase().includes(q) ||
        b.customer.name.toLowerCase().includes(q) ||
        b.bookingReference.toLowerCase().includes(q) ||
        (b.notes && b.notes.toLowerCase().includes(q))
    );
  }

  // Date range filter
  if (query.dateFrom) {
    const fromMs = new Date(query.dateFrom).getTime();
    items = items.filter((b) => new Date(b.startAt).getTime() >= fromMs);
  }
  if (query.dateTo) {
    const toMs = new Date(query.dateTo).getTime();
    items = items.filter((b) => new Date(b.startAt).getTime() <= toMs);
  }

  // Sort
  if (query.sort === "oldest") {
    items.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  } else if (query.sort === "upcoming") {
    items.sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
  } else {
    items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const pagedItems = items.slice((page - 1) * limit, page * limit);

  return { items: pagedItems, page, limit, total, totalPages };
}

function toBookingErrorCode(status?: number | string): "401" | "403" | "404" | "409" | "422" | "429" | "500" {
  const s = String(status);
  switch (s) {
    case "401":
    case "403":
    case "404":
    case "409":
    case "422":
    case "429":
      return s;
    default:
      return "500";
  }
}

/**
 * Fetches a single booking detail by id from the live backend.
 */
export async function fetchProviderBookingByIdLive(
  bookingId: string
): Promise<ServiceBooking | null> {
  const res = await apiClient.get<BackendBookingEntity[]>("/service-provider/bookings/me");
  if (res.error || !res.data) {
    return null;
  }
  const match = res.data.find((b) => b.id === bookingId);
  return match ? mapBackendBookingToFrontend(match) : null;
}

/**
 * Accepts an incoming booking request on the live backend.
 */
export async function acceptProviderBookingLive(
  bookingId: string,
  finalFee?: number
): Promise<BookingResult> {
  const { data, error } = await apiClient.post<unknown, BackendBookingEntity>(
    `/service-provider/bookings/${bookingId}/accept`
  );

  if (error || !data) {
    return {
      ok: false,
      error: {
        code: toBookingErrorCode(error?.status),
        message: error?.message || "Failed to accept booking",
      },
    };
  }

  const mapped = mapBackendBookingToFrontend(data);
  if (finalFee && Number.isFinite(finalFee)) {
    mapped.price.amount = finalFee;
  }
  return { ok: true, booking: mapped };
}

/**
 * Rejects an incoming booking request on the live backend.
 */
export async function rejectProviderBookingLive(
  bookingId: string,
  reason?: string
): Promise<BookingResult> {
  const { data, error } = await apiClient.post<{ reason?: string }, BackendBookingEntity>(
    `/service-provider/bookings/${bookingId}/reject`,
    { reason }
  );

  if (error || !data) {
    return {
      ok: false,
      error: {
        code: toBookingErrorCode(error?.status),
        message: error?.message || "Failed to decline booking",
      },
    };
  }

  return { ok: true, booking: mapBackendBookingToFrontend(data) };
}

/**
 * Fetches booking counts & KPI summary from live backend analytics and bookings.
 */
export async function fetchProviderBookingSummaryLive(): Promise<{
  pending: number;
  upcomingToday: number;
  upcoming: number;
  inProgress: number;
  completed: number;
  cancelled: number;
}> {
  const [statusCountsRes, bookingsRes] = await Promise.all([
    apiClient.get<BackendBookingStatusCounts>("/analytics/service-provider/bookings/status"),
    apiClient.get<BackendBookingEntity[]>("/service-provider/bookings/me"),
  ]);

  const counts = statusCountsRes.data || {};
  const bookings = bookingsRes.data || [];

  const todayStr = new Date().toISOString().split("T")[0];
  const upcomingToday = bookings.filter((b) => {
    const isConfirmed = b.status === "ACCEPTED" || b.status === "CONFIRMED";
    const dateStr =
      typeof b.scheduledDate === "string"
        ? b.scheduledDate.split("T")[0]
        : new Date(b.scheduledDate || Date.now()).toISOString().split("T")[0];
    return isConfirmed && dateStr === todayStr;
  }).length;

  return {
    pending: counts.pending ?? bookings.filter((b) => b.status === "PENDING").length,
    upcomingToday,
    upcoming: counts.accepted ?? bookings.filter((b) => b.status === "ACCEPTED" || b.status === "CONFIRMED").length,
    inProgress: counts.in_progress ?? bookings.filter((b) => b.status === "IN_PROGRESS").length,
    completed: counts.completed ?? bookings.filter((b) => b.status === "COMPLETED").length,
    cancelled:
      (counts.cancelled ?? 0) +
      (counts.rejected ?? 0) ||
      bookings.filter((b) => b.status === "CANCELLED" || b.status === "REJECTED").length,
  };
}
