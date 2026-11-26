import { describe, expect, it } from "vitest";
import { MY_BOOKING_TABS, myBookingsEmpty } from "./my-bookings-list";

describe("my bookings list", () => {
  it("has the same tabs as the app, with Requests and In progress", () => {
    expect(MY_BOOKING_TABS.map((t) => t.label)).toEqual(["Upcoming", "Requests", "In progress", "Completed", "Cancelled", "All"]);
  });

  it("says why a list is empty, in words, for every tab", () => {
    for (const t of MY_BOOKING_TABS) expect(myBookingsEmpty(t.key, false).title).not.toMatch(/_/);
    expect(myBookingsEmpty("in_progress", false).title).toBe("Nothing in progress");
    expect(myBookingsEmpty("completed", true).title).toBe("No bookings match");
  });
});
