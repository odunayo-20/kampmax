import { describe, expect, it } from "vitest";
import { createRepeatFilter, describeCheckInError, normalizeTicketNumber, parseTicketQr } from "../ticket-scan";

describe("parseTicketQr", () => {
  it("accepts a Kampmax ticket code and refuses anything else", () => {
    expect(parseTicketQr(`KMPX-EVENT:KMX-82941:${"a".repeat(32)}`).ok).toBe(true);
    expect(parseTicketQr("https://example.com").ok).toBe(false);
  });
});

describe("normalizeTicketNumber", () => {
  it.each(["kmx 82941", "KMX82941", " KMX-82941 "])("reads %j", (input) => {
    expect(normalizeTicketNumber(input)).toBe("KMX-82941");
  });
  it("refuses other text", () => {
    expect(normalizeTicketNumber("82941")).toBeNull();
  });
});

describe("createRepeatFilter", () => {
  it("counts a code held in view only once, even across a pause", () => {
    let time = 0;
    const filter = createRepeatFilter(1000, () => time);
    expect(filter.isNew("a")).toBe(true);
    time = 800;
    expect(filter.isNew("a")).toBe(false);
    time = 5000;
    filter.hold(); // a result was on screen all this time
    time = 5100;
    expect(filter.isNew("a")).toBe(false);
    time = 7000; // taken away and shown again
    expect(filter.isNew("a")).toBe(true);
    expect(filter.isNew("b")).toBe(true);
  });
});

describe("describeCheckInError", () => {
  it("warns rather than denies when there was no answer", () => {
    expect(describeCheckInError({ code: "NETWORK_ERROR" }).tone).toBe("warn");
    expect(describeCheckInError({ status: 429 }).tone).toBe("warn");
  });
  it("says a ticket was already used without the raw timestamp", () => {
    const outcome = describeCheckInError({ status: 409, message: "Ticket already used at 2026-11-25T12:00:00.000Z" });
    expect(outcome.title).toBe("Already checked in");
    expect(outcome.detail).not.toContain("T12");
  });
  it("denies a refunded ticket", () => {
    expect(describeCheckInError({ status: 400, message: "This ticket was refunded" }).tone).toBe("bad");
  });
});
