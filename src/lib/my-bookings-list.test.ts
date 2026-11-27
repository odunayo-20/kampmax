import { describe, expect, it } from "vitest";
import {
  acceptNote, canBookAgain, DECLINE_REASONS, declineReasonText, defaultSort, describeBookingActionError, describeRescheduleError,
  MY_BOOKING_TABS, myBookingsEmpty, openingTab, PROVIDER_BOOKING_TABS, providerBookingsEmpty, providerHeadline, providerPaymentLine,
  rescheduleNote, startOpensAt,
} from "./my-bookings-list";

describe("my bookings list", () => {
  it("has the same tabs as the app, with Requests and In progress", () => {
    expect(MY_BOOKING_TABS.map((t) => t.label)).toEqual(["Upcoming", "Requests", "In progress", "Completed", "Cancelled", "All"]);
  });

  it("says why a list is empty, in words, for every tab", () => {
    for (const t of MY_BOOKING_TABS) expect(myBookingsEmpty(t.key, false).title).not.toMatch(/_/);
    expect(myBookingsEmpty("in_progress", false).title).toBe("Nothing in progress");
    expect(myBookingsEmpty("completed", true).title).toBe("No bookings match");
  });

  it("warns that a moved request needs the provider again, and keeps failures plain", () => {
    expect(rescheduleNote("request_approval")).toMatch(/accept the new time.*24 hours/);
    expect(describeRescheduleError("409", "x").kind).toBe("taken");
    expect(describeRescheduleError("422", "Pick one of the times offered for that day.").message).toBe("Pick one of the times offered for that day.");
    expect(describeRescheduleError("500", "QueryFailedError").message).toMatch(/check the time/);
  });

  it("offers to book again only once a booking is over", () => {
    expect(["completed", "cancelled", "declined"].every(canBookAgain)).toBe(true);
    expect(["pending", "confirmed", "in_progress"].some(canBookAgain)).toBe(false);
  });
});

describe("provider bookings list", () => {
  it("uses the same tab names as the customer, requests first", () => {
    expect(PROVIDER_BOOKING_TABS.map((t) => t.label)).toEqual(["Requests", "Upcoming", "In progress", "Completed", "Cancelled", "All"]);
  });

  it("opens on requests unless there are none, and lists requests and upcoming soonest first", () => {
    expect(openingTab(null)).toBe("pending");
    expect(openingTab({ pending: 0, upcoming: 2 })).toBe("upcoming");
    expect(openingTab({ pending: 1, upcoming: 2 })).toBe("pending");
    expect(defaultSort("pending")).toBe("upcoming");
    expect(defaultSort("upcoming")).toBe("upcoming");
    expect(defaultSort("completed")).toBe("newest");
    expect(defaultSort(undefined)).toBe("newest");
  });

  it("says in one line what needs the provider, and why a list is empty", () => {
    expect(providerHeadline({ pending: 2, upcomingToday: 1, inProgress: 0 })).toBe("2 requests need your answer · 1 today");
    expect(providerHeadline({ pending: 1, upcomingToday: 0, inProgress: 3 })).toBe("1 request needs your answer · 3 in progress");
    expect(providerHeadline({ pending: 0, upcomingToday: 0, inProgress: 0 })).toBeNull();
    expect(providerBookingsEmpty("pending", false).title).toBe("No requests right now");
    expect(providerBookingsEmpty("pending", true).title).toBe("No bookings match");
  });
});

describe("provider booking detail", () => {
  const b = (status: string, payment: string, escrow = "held") => ({ status, fulfillment: { payment: { state: payment }, escrow: { state: escrow } } });

  it("tells the provider where the money is in their own words", () => {
    expect(providerPaymentLine(b("confirmed", "escrow_held"))).toMatch(/Held by Kampmax.*once the job is done/);
    expect(providerPaymentLine(b("completed", "escrow_held"))).toMatch(/72 hours after you marked the job done/);
    expect(providerPaymentLine(b("completed", "escrow_held", "disputed"))).toMatch(/Kampmax support/);
    expect(providerPaymentLine(b("completed", "released", "released"))).toBe("Paid to you.");
    expect(providerPaymentLine(b("declined", "refunded", "refunded"))).toBe("Refunded to the customer.");
    expect(providerPaymentLine(b("confirmed", "escrow_held"))).not.toMatch(/your wallet|you confirm/);
  });

  it("opens Start 30 minutes before the booking, and keeps the note when declining", () => {
    const now = Date.parse("2026-11-26T10:00:00Z");
    const at = (min: number) => new Date(now + min * 60_000).toISOString();
    expect(startOpensAt({ status: "confirmed", startAt: at(120) }, now)).toBe(now + 90 * 60_000);
    expect(startOpensAt({ status: "confirmed", startAt: at(20) }, now)).toBeNull();
    expect(startOpensAt({ status: "pending", startAt: at(120) }, now)).toBeNull();
    expect(declineReasonText("Scheduling conflict", " Try Friday ")).toBe("Scheduling conflict. Try Friday");
    expect(declineReasonText("Other", " ")).toBe("Other");
    expect(DECLINE_REASONS).toContain("Other");
    expect(acceptNote("₦5,000")).toMatch(/already held by Kampmax/);
  });

  it("shows a server reason only when it is a short refusal", () => {
    expect(describeBookingActionError("422", "It is too early to start this appointment.")).toBe("It is too early to start this appointment.");
    expect(describeBookingActionError("500", "QueryFailedError")).toMatch(/didn't go through/);
    expect(describeBookingActionError("422", "x".repeat(300))).toMatch(/didn't go through/);
    expect(describeBookingActionError("404", "")).toBe("This booking could not be found.");
  });
});
