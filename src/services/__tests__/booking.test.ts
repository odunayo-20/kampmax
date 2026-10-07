import { beforeEach, describe, expect, it, vi } from "vitest";

const get = vi.fn();
const post = vi.fn();
vi.mock("@/lib/api-client", () => ({
  apiClient: { get: (...a: unknown[]) => get(...a), post: (...a: unknown[]) => post(...a) },
}));

import {
  bookingStartLabel,
  cancelBooking,
  confirmBookingCompletion,
  createBooking,
  declineBooking,
  fetchBookingAvailability,
  fetchCustomerBooking,
  fetchCustomerBookingCounts,
  fetchCustomerBookings,
  getBookingLocationOptions,
  getBookingReadyState,
} from "../booking";
import type { ServiceBooking } from "@/types/booking";

const HOUR = 3_600_000;

function booking(over: Record<string, unknown> = {}, fulfillment: Record<string, unknown> = {}): ServiceBooking {
  return {
    id: "b1",
    status: "confirmed",
    bookingPreference: "request_approval",
    startAt: new Date(Date.now() + 5 * HOUR).toISOString(),
    endAt: new Date(Date.now() + 6 * HOUR).toISOString(),
    fulfillment: {
      confirmationStatus: "not_required",
      payment: { state: "escrow_held", label: "Held" },
      escrow: { state: "held", label: "Held" },
      ...fulfillment,
    },
    ...over,
  } as unknown as ServiceBooking;
}

const ok = <T>(data: T) => Promise.resolve({ data, error: null });
const fail = (status: number, message: string) =>
  Promise.resolve({ data: null, error: Object.assign(new Error(message), { status }) });

beforeEach(() => vi.clearAllMocks());

describe("booking calls", () => {
  it("books with exactly what the backend asks for, and reports a duplicate retry", async () => {
    post.mockImplementation(() => ok({ booking: { id: "b1" }, alreadyExisted: true }));
    const res = await createBooking({
      serviceId: "s1",
      startAt: "2026-10-08T08:00:00.000Z",
      locationType: "provider_location",
      customerPhone: "+2348012345678",
      idempotencyKey: "key-12345678",
    });
    expect(res).toMatchObject({ ok: true, alreadyExisted: true });
    expect(post).toHaveBeenCalledWith(
      "/bookings",
      expect.objectContaining({ serviceId: "s1", idempotencyKey: "key-12345678" }),
    );
  });

  it("turns server failures into errors the screen can show", async () => {
    post.mockImplementation(() => fail(409, "That time was just booked by someone else. Pick a new time."));
    const res = await createBooking({
      serviceId: "s1",
      startAt: "x",
      locationType: "online",
      customerPhone: "1",
      idempotencyKey: "k",
    });
    expect(res).toEqual({
      ok: false,
      error: expect.objectContaining({ code: "409", recoverable: true, field: "startAt", message: expect.stringMatching(/just booked/) }),
    });

    post.mockImplementation(() => fail(422, "Your wallet balance is too low for ₦5,000."));
    const low = await cancelBooking({ id: "b1", cancelledBy: "customer" });
    expect(low).toMatchObject({ ok: false, error: { code: "422" } });

    post.mockImplementation(() => fail(400, "validation failed"));
    expect(await declineBooking("b1")).toMatchObject({ ok: false, error: { code: "422" } });

    post.mockImplementation(() => fail(503, "down"));
    expect(await confirmBookingCompletion("b1")).toMatchObject({ ok: false, error: { code: "500" } });
  });

  it("sends each person's action to their own route", async () => {
    post.mockImplementation(() => ok({ id: "b1" }));
    await cancelBooking({ id: "b1", cancelledBy: "customer", reason: "x" });
    await cancelBooking({ id: "b1", cancelledBy: "provider" });
    await declineBooking("b1", "busy");
    expect(post.mock.calls.map((c) => c[0])).toEqual([
      "/bookings/me/b1/cancel",
      "/bookings/provider/b1/cancel",
      "/bookings/provider/b1/decline",
    ]);
  });
});

describe("booking reads", () => {
  it("throws a message instead of showing made-up availability", async () => {
    get.mockImplementation(() => fail(422, "This service can't be booked online."));
    await expect(fetchBookingAvailability("s1")).rejects.toThrow(/can't be booked/);
  });

  it("flattens a page and asks for the filters that were chosen", async () => {
    get.mockImplementation(() =>
      ok({ items: [{ id: "b1" }], meta: { total: 1, page: 2, limit: 12, totalPages: 3 } }),
    );
    const page = await fetchCustomerBookings({ status: "upcoming", page: 2, search: " braid " });
    expect(page).toEqual({ items: [{ id: "b1" }], total: 1, page: 2, limit: 12, totalPages: 3 });
    expect(get.mock.calls[0][0]).toBe("/bookings/me?status=upcoming&search=braid&page=2&limit=12");
  });

  it("returns null for a booking that is not yours or not there, and throws on a real failure", async () => {
    get.mockImplementation(() => fail(404, "Booking not found."));
    expect(await fetchCustomerBooking("b1")).toBeNull();
    get.mockImplementation(() => fail(500, "boom"));
    await expect(fetchCustomerBooking("b1")).rejects.toThrow("boom");
  });

  it("counts every tab from the server", async () => {
    get.mockImplementation(() => ok({ items: [], meta: { total: 4, page: 1, limit: 1, totalPages: 4 } }));
    const counts = await fetchCustomerBookingCounts();
    expect(counts).toEqual({ upcoming: 4, in_progress: 4, completed: 4, past: 4, cancelled: 4, all: 4 });
  });
});

describe("getBookingReadyState", () => {
  it("allows cancelling and rescheduling until two hours before", () => {
    expect(getBookingReadyState(booking()).canCancel).toBe(true);
    const soon = booking({ startAt: new Date(Date.now() + HOUR).toISOString() });
    const ready = getBookingReadyState(soon);
    expect(ready.canCancel).toBe(false);
    expect(ready.canReschedule).toBe(false);
    expect(ready.cancelBlockedReason).toMatch(/2 hours/);
  });

  it("offers confirming or reporting only while the customer's answer is awaited", () => {
    const awaiting = booking({ status: "completed" }, { confirmationStatus: "awaiting" });
    expect(getBookingReadyState(awaiting)).toMatchObject({ canConfirmCompletion: true, canReportProblem: true, canReview: false });

    const confirmed = booking({ status: "completed" }, { confirmationStatus: "confirmed", reviewEligibleUntil: new Date(Date.now() + 5 * HOUR).toISOString() });
    expect(getBookingReadyState(confirmed)).toMatchObject({ canConfirmCompletion: false, canReportProblem: false, canReview: true });

    const reviewed = booking({ status: "completed" }, { confirmationStatus: "confirmed", review: { rating: 5 } });
    expect(getBookingReadyState(reviewed).canReview).toBe(false);

    const lapsed = booking({ status: "completed" }, { confirmationStatus: "confirmed", reviewEligibleUntil: new Date(Date.now() - HOUR).toISOString() });
    expect(getBookingReadyState(lapsed).canReview).toBe(false);
  });

  it("reports payment from where the money is", () => {
    expect(getBookingReadyState(booking()).paymentStage).toBe("pending");
    expect(getBookingReadyState(booking({}, { payment: { state: "released", label: "Paid" } })).paymentStage).toBe("settled");
    expect(getBookingReadyState(booking({}, { payment: { state: "refunded", label: "Back" } })).paymentStage).toBe("not_required");
  });
});

describe("helpers", () => {
  it("only offers online for remote services", () => {
    expect(getBookingLocationOptions("online").map((o) => o.type)).toEqual(["online"]);
    expect(getBookingLocationOptions("both").map((o) => o.type)).toEqual(["provider_location", "customer_location"]);
  });

  it("labels times in Lagos, not the viewer's timezone", () => {
    // 08:00 UTC is 09:00 in Lagos.
    expect(bookingStartLabel({ startAt: "2026-10-08T08:00:00.000Z", endAt: "2026-10-08T09:00:00.000Z" })).toMatch(/09:00.*10:00/);
  });
});
