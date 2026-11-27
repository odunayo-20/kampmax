import { describe, expect, it } from "vitest";
import { contactLinks, enquiryStatusView, matchesFilter, statusChoices, visitActions, visitDate, visitsFor, waitingText } from "./agent-enquiry";

describe("an agent's housing enquiry", () => {
  it("names statuses and offers only the ones an agent may set", () => {
    expect(enquiryStatusView("CANCELLED").label).toBe("Cancelled by student");
    expect(statusChoices("CONTACTED").map((s) => s.id)).toEqual(["NEGOTIATING", "VISITED", "CLOSED", "UNRESPONSIVE"]);
    expect(statusChoices("CLOSED")).toEqual([]);
  });

  it("filters the list and shows how long a new enquiry has waited", () => {
    expect(matchesFilter({ status: "NEW" }, "active")).toBe(false);
    expect(matchesFilter({ status: "NEGOTIATING" }, "active")).toBe(true);
    expect(matchesFilter({ status: "UNRESPONSIVE" }, "finished")).toBe(true);
    const now = new Date("2026-11-27T12:00:00Z");
    expect(waitingText({ status: "NEW", firstResponseAt: null, createdAt: "2026-11-27T07:00:00Z" }, now)).toBe("Waiting 5 hours");
    expect(waitingText({ status: "NEW", firstResponseAt: null, createdAt: "2026-11-24T12:00:00Z" }, now)).toBe("Waiting 3 days");
    expect(waitingText({ status: "CONTACTED", firstResponseAt: null, createdAt: "2026-11-24T12:00:00Z" }, now)).toBeNull();
  });

  it("links only clean phone numbers and addresses", () => {
    expect(contactLinks({ phone: "0803 123 4567", email: "ada@uni.edu.ng" }).phone?.url).toBe("tel:08031234567");
    expect(contactLinks({ phone: "javascript:alert(1)", email: "a@b" })).toMatchObject({ phone: null, email: null });
  });

  it("sorts visits soonest first, and past ones most recent first", () => {
    const v = (id: string, status: string, requestedDate: string, confirmedDate: string | null = null) => ({ id, status, requestedDate, proposedDate: null, confirmedDate });
    const items = [
      v("a", "CONFIRMED", "2026-12-01T10:00:00Z", "2026-12-05T10:00:00Z"),
      v("b", "CONFIRMED", "2026-12-03T10:00:00Z", "2026-12-03T10:00:00Z"),
      v("c", "COMPLETED", "2026-11-01T10:00:00Z", "2026-11-02T10:00:00Z"),
      v("d", "CANCELLED", "2026-11-20T10:00:00Z"),
      v("e", "REQUESTED", "2026-12-10T10:00:00Z"),
    ];
    expect(visitsFor(items, "upcoming").map((i) => i.id)).toEqual(["b", "a"]);
    expect(visitsFor(items, "past").map((i) => i.id)).toEqual(["d", "c"]);
    expect(visitsFor(items, "answer").map((i) => i.id)).toEqual(["e"]);
    expect(visitDate(items[0])).toBe("2026-12-05T10:00:00Z");
  });

  it("allows marking a visit done only after its time", () => {
    const now = new Date("2026-11-27T12:00:00Z");
    expect(visitActions({ status: "CONFIRMED", confirmedDate: "2026-11-28T10:00:00Z" }, now)).toMatchObject({ complete: false, cancel: true });
    expect(visitActions({ status: "CONFIRMED", confirmedDate: "2026-11-26T10:00:00Z" }, now).complete).toBe(true);
    expect(visitActions({ status: "REQUESTED", confirmedDate: null }, now)).toMatchObject({ answer: true, cancel: true });
  });
});
