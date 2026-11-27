import { describe, expect, it } from "vitest";
import { isFinalEnquiry, localInputValue, myEnquiryStatus, myVisitActions, myVisitView, visitTimeProblem, visitWindow } from "./accommodation-enquiry";

describe("a student's housing enquiry", () => {
  it("names each status in plain words", () => {
    expect(myEnquiryStatus("INSPECTION_SCHEDULED").label).toBe("Visit booked");
    expect(myEnquiryStatus("CONTACTED").label).toBe("Agent replied");
    expect(myEnquiryStatus("CANCELLED").label).toBe("Closed by you");
    expect(isFinalEnquiry("NOT_INTERESTED")).toBe(true);
    expect(isFinalEnquiry("NEGOTIATING")).toBe(false);
  });

  it("lets the student ask to visit again after a declined or called-off visit", () => {
    expect(myVisitActions("CONTACTED", null)).toEqual({ request: true, answer: false, cancel: false });
    expect(myVisitActions("CONTACTED", { status: "REJECTED" }).request).toBe(true);
    expect(myVisitActions("CONTACTED", { status: "CANCELLED" }).request).toBe(true);
    expect(myVisitActions("CONTACTED", { status: "CONFIRMED" })).toEqual({ request: false, answer: false, cancel: true });
    expect(myVisitActions("CONTACTED", { status: "RESCHEDULE_PROPOSED" })).toEqual({ request: false, answer: true, cancel: true });
    expect(myVisitActions("CLOSED", null).request).toBe(false);
  });

  it("explains the visit, and keeps the time between an hour and 60 days away", () => {
    expect(myVisitView({ status: "REJECTED", requestedDate: "2026-12-01T10:00:00Z", proposedDate: null, confirmedDate: null }).text).toMatch(/ask for another/);
    const now = new Date("2026-11-26T10:00:00Z");
    expect(visitTimeProblem(new Date("2026-11-26T10:30:00Z"), now)).toMatch(/an hour/);
    expect(visitTimeProblem(new Date("2027-02-26T10:00:00Z"), now)).toMatch(/60 days/);
    expect(visitTimeProblem(new Date("2026-11-28T10:00:00Z"), now)).toBeNull();
    expect(visitTimeProblem(new Date("x"), now)).toMatch(/Choose a date/);
    expect(localInputValue(new Date(2026, 11, 5, 14, 7))).toBe("2026-12-05T14:07");
    expect(visitWindow(new Date(2026, 10, 26, 10, 0)).min).toBe("2026-11-26T11:00");
  });
});
