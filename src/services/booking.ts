import { apiClient, type ApiError } from "@/lib/api-client";
import type {
  BookingAvailabilityResponse,
  BookingError,
  BookingEvidence,
  BookingListFilter,
  BookingListQuery,
  BookingPageResult,
  BookingPaymentStage,
  BookingReadyState,
  BookingResult,
  BookingReviewInput,
  CancelBookingInput,
  CreateBookingInput,
  FulfillmentConfirmationStatus,
  ProviderBookingStatusFilter,
  RescheduleBookingInput,
  ServiceBooking,
  ServiceProblemCategory,
} from "@/types/booking";
import { BOOKING_STATUS_SHORT_LABELS } from "@/types/booking";
import type { ServiceProviderLocationType } from "@/types/service-provider";

// Bookings, straight from the backend (/bookings). Every price, slot, status
// and payment state is decided there; this module only asks and reports.
// Failures come back as a BookingError for the screen to show. Nothing is
// simulated or kept in the browser.

export const BOOKING_TIME_ZONE = "Africa/Lagos";
const FREE_CANCELLATION_HOURS = 2;

// ── Transport ─────────────────────────────────────────────────

function toBookingError(error: ApiError | null, fallback: string): BookingError {
  const status = error?.status;
  const code: BookingError["code"] =
    status === 401 || status === 403 || status === 404 || status === 409 || status === 422 || status === 429
      ? (String(status) as BookingError["code"])
      : status === 400
        ? "422"
        : "500";
  return {
    code,
    message: error?.message || fallback,
    recoverable: status === 409,
    field: status === 409 ? "startAt" : undefined,
  };
}

async function send<TBody, TResult>(
  method: "post" | "get",
  path: string,
  body?: TBody
): Promise<{ data: TResult | null; error: BookingError | null }> {
  const { data, error } =
    method === "get"
      ? await apiClient.get<TResult>(path)
      : await apiClient.post<TBody | undefined, TResult>(path, body);
  if (error || data === null || data === undefined) {
    return { data: null, error: toBookingError(error, "Something went wrong. Please try again.") };
  }
  return { data, error: null };
}

async function action(path: string, body?: unknown): Promise<BookingResult> {
  const { data, error } = await send<unknown, ServiceBooking>("post", path, body ?? {});
  return data ? { ok: true, booking: data } : { ok: false, error: error! };
}

function query(params: Record<string, string | number | undefined>): string {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== "" && v !== "all") qs.set(k, String(v));
  }
  const text = qs.toString();
  return text ? `?${text}` : "";
}

// ── Availability and locations ────────────────────────────────

/** Bookable days and times for a service. Throws a message the screen can show. */
export async function fetchBookingAvailability(serviceId: string): Promise<BookingAvailabilityResponse> {
  const { data, error } = await send<never, BookingAvailabilityResponse>(
    "get",
    `/bookings/availability${query({ serviceId })}`
  );
  if (!data) throw new Error(error?.message || "Could not load available times.");
  return data;
}

export interface BookingLocationOption {
  type: ServiceProviderLocationType;
  label: string;
  description: string;
}

export function getBookingLocationOptions(locationType: ServiceProviderLocationType): BookingLocationOption[] {
  if (locationType === "online") {
    return [{ type: "online", label: "Online session", description: "Remote, no travel needed." }];
  }
  return [
    { type: "provider_location", label: "At the provider's location", description: "Visit the provider in person." },
    { type: "customer_location", label: "At your location", description: "The provider comes to you." },
  ];
}

// ── Mutations ─────────────────────────────────────────────────

interface CreateResponse {
  booking: ServiceBooking;
  alreadyExisted: boolean;
}

export async function createBooking(input: CreateBookingInput): Promise<BookingResult> {
  const { data, error } = await send<CreateBookingInput, CreateResponse>("post", "/bookings", {
    serviceId: input.serviceId,
    startAt: input.startAt,
    locationType: input.locationType as CreateBookingInput["locationType"],
    address: input.address,
    notes: input.notes,
    customerPhone: input.customerPhone,
    idempotencyKey: input.idempotencyKey,
  });
  return data
    ? { ok: true, booking: data.booking, alreadyExisted: data.alreadyExisted }
    : { ok: false, error: error! };
}

export function cancelBooking(input: CancelBookingInput): Promise<BookingResult> {
  const side = input.cancelledBy === "provider" ? "provider" : "me";
  return action(`/bookings/${side}/${input.id}/cancel`, { reason: input.reason });
}

export function rescheduleBooking(input: RescheduleBookingInput): Promise<BookingResult> {
  return action(`/bookings/me/${input.id}/reschedule`, {
    startAt: input.startAt,
    idempotencyKey: input.idempotencyKey,
  });
}

export function acceptBooking(id: string): Promise<BookingResult> {
  return action(`/bookings/provider/${id}/accept`);
}

export function declineBooking(id: string, reason?: string): Promise<BookingResult> {
  return action(`/bookings/provider/${id}/decline`, { reason });
}

export function startBooking(id: string): Promise<BookingResult> {
  return action(`/bookings/provider/${id}/start`);
}

export function completeBooking(id: string, evidence?: BookingEvidence[]): Promise<BookingResult> {
  return action(`/bookings/provider/${id}/complete`, {
    evidence: evidence?.map(({ kind, name, mime, sizeBytes }) => ({ kind, name, mime, sizeBytes })),
  });
}

export function confirmBookingCompletion(id: string): Promise<BookingResult> {
  return action(`/bookings/me/${id}/confirm-completion`);
}

export interface ReportBookingProblemInput {
  category: ServiceProblemCategory;
  description: string;
  evidence?: BookingEvidence[];
}

export function reportBookingProblem(id: string, input: ReportBookingProblemInput): Promise<BookingResult> {
  return action(`/bookings/me/${id}/report-problem`, {
    category: input.category,
    description: input.description,
    evidence: input.evidence?.map(({ kind, name, mime, sizeBytes }) => ({ kind, name, mime, sizeBytes })),
  });
}

export function submitBookingReview(id: string, input: BookingReviewInput): Promise<BookingResult> {
  return action(`/bookings/me/${id}/review`, input);
}

// ── Reads ─────────────────────────────────────────────────────

const BOOKING_LIST_PAGE_SIZE = 12;

interface BackendPage {
  items: ServiceBooking[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

async function fetchPage(path: string, q: BookingListQuery): Promise<BookingPageResult> {
  const { data, error } = await send<never, BackendPage>(
    "get",
    `${path}${query({
      status: q.status,
      search: q.search?.trim(),
      serviceId: q.serviceId,
      dateFrom: q.dateFrom,
      dateTo: q.dateTo,
      sort: q.sort,
      page: q.page ?? 1,
      limit: q.limit ?? BOOKING_LIST_PAGE_SIZE,
    })}`
  );
  if (!data) throw new Error(error?.message || "Could not load your bookings.");
  return { items: data.items, ...data.meta };
}

export function fetchCustomerBookings(q: BookingListQuery = {}): Promise<BookingPageResult> {
  return fetchPage("/bookings/me", q);
}

export function fetchProviderBookings(q: BookingListQuery = {}): Promise<BookingPageResult> {
  return fetchPage("/bookings/provider", q);
}

export async function fetchCustomerBooking(id: string): Promise<ServiceBooking | null> {
  const { data, error } = await send<never, ServiceBooking>("get", `/bookings/me/${id}`);
  if (data) return data;
  if (error?.code === "404") return null;
  throw new Error(error?.message || "Could not load this booking.");
}

export async function fetchProviderBooking(id: string): Promise<ServiceBooking | null> {
  const { data, error } = await send<never, ServiceBooking>("get", `/bookings/provider/${id}`);
  if (data) return data;
  if (error?.code === "404" || error?.code === "403") return null;
  throw new Error(error?.message || "Could not load this booking.");
}

export async function fetchCustomerBookingCounts(): Promise<Record<BookingListFilter, number>> {
  const filters: BookingListFilter[] = ["upcoming", "in_progress", "completed", "past", "cancelled", "all"];
  const totals = await Promise.all(filters.map((status) => fetchPage("/bookings/me", { status, limit: 1 })));
  return Object.fromEntries(filters.map((f, i) => [f, totals[i].total])) as Record<BookingListFilter, number>;
}

export interface ProviderBookingSummary {
  pending: number;
  upcomingToday: number;
  upcoming: number;
  inProgress: number;
  completed: number;
  cancelled: number;
}

export async function fetchProviderBookingSummary(): Promise<ProviderBookingSummary> {
  const { data, error } = await send<never, ProviderBookingSummary>("get", "/bookings/provider/stats");
  if (!data) throw new Error(error?.message || "Could not load your booking summary.");
  return data;
}

export type ProviderBookingFilter = ProviderBookingStatusFilter;

// ── Ready states (what the screen may offer; the backend still decides) ──

export function getBookingReadyState(booking: ServiceBooking): BookingReadyState {
  const nowMs = Date.now();
  const startMs = new Date(booking.startAt).getTime();
  const f = booking.fulfillment;
  const done = booking.status === "completed";
  const reviewClosed = done && !!f.reviewEligibleUntil && new Date(f.reviewEligibleUntil).getTime() < nowMs;
  const withinFreeWindow = startMs - FREE_CANCELLATION_HOURS * 3_600_000 > nowMs;
  const open = booking.status === "pending" || booking.status === "confirmed";

  let paymentStage: BookingPaymentStage = "not_started";
  if (f.payment.state === "released") paymentStage = "settled";
  else if (f.payment.state === "escrow_held") paymentStage = "pending";
  else if (f.payment.state === "refunded") paymentStage = "not_required";

  return {
    paymentStage,
    paymentLabel: f.payment.label,
    requiresProviderApproval: booking.bookingPreference === "request_approval" && booking.status === "pending",
    canCancel: open && withinFreeWindow,
    canReschedule: open && withinFreeWindow,
    canReview: done && f.confirmationStatus === "confirmed" && !f.review && !reviewClosed,
    canConfirmCompletion: done && f.confirmationStatus === "awaiting",
    canReportProblem: done && f.confirmationStatus === "awaiting",
    confirmationStatus: f.confirmationStatus as FulfillmentConfirmationStatus,
    cancelBlockedReason:
      open && !withinFreeWindow
        ? `Free cancellation ended ${FREE_CANCELLATION_HOURS} hours before the appointment. Contact the provider.`
        : undefined,
  };
}

// ── Formatting (the booking timezone decides every label) ──

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
const dateFormatter = new Intl.DateTimeFormat("en-NG", {
  weekday: "short",
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: BOOKING_TIME_ZONE,
});

const toMs = (v: number | string) => (typeof v === "string" ? new Date(v).getTime() : v);

/** "Sat 13 Feb" */
export const formatBookingDay = (v: number | string): string => dayFormatter.format(toMs(v));

/** "Sat 13 Feb 2026" */
export const formatBookingDate = (v: number | string): string => dateFormatter.format(toMs(v));

/** "09:30" */
export const formatBookingTime = (v: number | string): string => timeFormatter.format(toMs(v));

/** "Sat 13 Feb · 09:30–10:30" */
export function bookingStartLabel(booking: Pick<ServiceBooking, "startAt" | "endAt">): string {
  return `${formatBookingDay(booking.startAt)} · ${formatBookingTime(booking.startAt)}–${formatBookingTime(booking.endAt)}`;
}

export function bookingStatusLabel(status: ServiceBooking["status"]): string {
  return BOOKING_STATUS_SHORT_LABELS[status];
}
