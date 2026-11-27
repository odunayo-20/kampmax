import { describe, expect, it } from "vitest";
import { canBookAgain, describeRescheduleError, MY_BOOKING_TABS, myBookingsEmpty, rescheduleNote } from "./my-bookings-list";

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
