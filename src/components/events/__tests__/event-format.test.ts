import { describe, expect, it } from "vitest";
import { eventDate, eventTime, isBookable, naira, priceLabel } from "../event-format";
import type { EventItem } from "@/types/event-ticketing";

const future = (ms: number) => new Date(Date.now() + ms).toISOString();

function event(over: Partial<EventItem> = {}): EventItem {
  return {
    id: "e1",
    campusId: "c1",
    organizerId: "o1",
    organizerName: "Org",
    organizationName: null,
    title: "Summit",
    description: "",
    location: "Hall",
    startsAt: future(3_600_000),
    endsAt: future(7_200_000),
    coverImageUrl: null,
    capacity: null,
    isFeatured: false,
    status: "ACTIVE",
    category: null,
    attendeeCount: 0,
    ticketsSold: 0,
    seatsLeft: 10,
    minPrice: 2000,
    serviceFee: 100,
    tiers: [],
    attending: false,
    createdAt: future(0),
    ...over,
  };
}

describe("priceLabel", () => {
  it("says Free with no tiers or a free tier", () => {
    expect(priceLabel(event({ minPrice: 0, tiers: [] }))).toBe("Free");
    expect(priceLabel(event({ minPrice: 0 }))).toBe("Free");
  });

  it("shows the lowest price for paid events", () => {
    const label = priceLabel(
      event({
        minPrice: 1500,
        tiers: [{ id: "t", name: "Early", description: "", price: 1500, quantity: 5, sold: 0, remaining: 5, isLimited: true, soldOut: false }],
      })
    );
    expect(label).toContain("1,500");
  });
});

describe("isBookable", () => {
  it("is true for an active event with seats", () => {
    expect(isBookable(event())).toBe(true);
  });
  it("is false when cancelled, ended or sold out", () => {
    expect(isBookable(event({ status: "CANCELLED" }))).toBe(false);
    expect(isBookable(event({ endsAt: new Date(Date.now() - 1000).toISOString() }))).toBe(false);
    expect(isBookable(event({ seatsLeft: 0 }))).toBe(false);
  });
});

describe("naira", () => {
  it("formats whole and fractional amounts", () => {
    expect(naira(2100)).toContain("2,100");
    expect(naira(99.5)).toContain("99.5");
  });
});

describe("event times", () => {
  // 10:00 in London/UTC is 11:00 in Lagos (UTC+1, no daylight saving), whatever the
  // machine's own time zone, so a server and a browser always print the same time.
  it("are shown in Nigerian time, not the machine's", () => {
    expect(eventTime("2026-06-01T10:00:00Z")).toMatch(/^11:00/);
  });

  it("move to the next day when Nigerian time does", () => {
    // 23:30 UTC on 1 June is 00:30 on 2 June in Lagos.
    expect(eventDate("2026-06-01T23:30:00Z")).toBe("2 Jun 2026");
  });
});
