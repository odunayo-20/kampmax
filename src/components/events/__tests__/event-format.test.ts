import { describe, expect, it } from "vitest";
import {
  emptyEventsCopy,
  eventAction,
  eventDate,
  eventTime,
  isBookable,
  naira,
  priceLabel,
  seatsUrgency,
  startsIn,
} from "../event-format";
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

describe("eventAction", () => {
  const tier = { id: "t", name: "GA", price: 2000 } as EventItem["tiers"][number];
  const now = Date.now();
  it("offers a ticket, or registration when it is free", () => {
    expect(eventAction(event({ tiers: [tier] }), now)).toMatchObject({ kind: "ticket", bookable: true });
    expect(eventAction(event({ tiers: [tier], minPrice: 0 }), now)).toMatchObject({ kind: "free", bookable: true });
  });
  it("says why an event cannot be booked", () => {
    expect(eventAction(event({ status: "CANCELLED" }), now).label).toBe("Cancelled");
    expect(eventAction(event({ endsAt: future(-1000), startsAt: future(-5000) }), now).label).toBe("Ended");
    expect(eventAction(event({ attending: true, tiers: [tier] }), now).kind).toBe("held");
    expect(eventAction(event({ seatsLeft: 0, tiers: [tier] }), now).label).toBe("Sold out");
    expect(eventAction(event({ tiers: [] }), now).label).toBe("Not on sale yet");
  });
});

describe("startsIn and seatsUrgency", () => {
  it("names how soon an event starts", () => {
    const now = new Date(2026, 5, 10, 12).getTime();
    expect(startsIn(new Date(2026, 5, 10, 18).toISOString(), undefined, now)).toBe("Today");
    expect(startsIn(new Date(2026, 5, 11, 9).toISOString(), undefined, now)).toBe("Tomorrow");
    expect(startsIn(new Date(2026, 5, 15, 9).toISOString(), undefined, now)).toBe("In 5 days");
    expect(startsIn(new Date(2026, 5, 10, 9).toISOString(), new Date(2026, 5, 10, 15).toISOString(), now)).toBe("Happening now");
  });
  it("flags few seats as urgent", () => {
    expect(seatsUrgency(0)).toEqual({ isUrgent: true, label: "Sold out" });
    expect(seatsUrgency(4)).toEqual({ isUrgent: true, label: "Only 4 left!" });
    expect(seatsUrgency(40)).toEqual({ isUrgent: false, label: "40 seats left" });
  });
});

describe("emptyEventsCopy", () => {
  it("says why the list is empty", () => {
    expect(emptyEventsCopy("jazz", "all", "UNILAG").title).toBe('No events match "jazz"');
    expect(emptyEventsCopy("", "today", "UNILAG").title).toBe("No events in this time range");
  });
});
