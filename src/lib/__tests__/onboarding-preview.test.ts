import { describe, expect, it } from "vitest";
import {
  eventToPreview,
  pickUpcomingEvent,
  productToPreview,
  serviceToPreview,
} from "../onboarding-preview";
import type { Product } from "@/types";
import type { EventItem } from "@/types/event-ticketing";
import type { MarketplaceService } from "@/types/service-marketplace";

const product = (over: Partial<Product> = {}) =>
  ({ id: "p1", title: "Desk lamp", price: 5000, condition: "Used", ...over }) as Product;

const service = (over: Partial<MarketplaceService> = {}) =>
  ({
    id: "s1",
    name: "Logo design",
    categoryId: "unknown-category",
    pricingModel: "fixed",
    price: 15000,
    provider: { id: "pr1", slug: "ada", displayName: "Ada", verified: false },
    ...over,
  }) as MarketplaceService;

const event = (over: Partial<EventItem> = {}) =>
  ({
    id: "e1",
    title: "Tech fest",
    location: "Main hall",
    startsAt: "2030-01-10T10:00:00Z",
    endsAt: "2030-01-10T14:00:00Z",
    status: "ACTIVE",
    category: null,
    attendeeCount: 0,
    minPrice: 0,
    ...over,
  }) as EventItem;

describe("productToPreview", () => {
  it("uses the record's own fields", () => {
    expect(productToPreview(product({ location: "Block A" }))).toMatchObject({
      title: "Desk lamp",
      tag: "Used",
      detail: "Block A",
      href: "/marketplace/p1",
    });
  });

  it("leaves out what the record doesn't have instead of inventing it", () => {
    const p = productToPreview(product({ price: 0, location: undefined }))!;
    expect(p.extra).toBeUndefined();
    expect(p.detail).toBeUndefined();
  });

  it("skips a record with no title", () => {
    expect(productToPreview(product({ title: "  " }))).toBeNull();
  });
});

describe("serviceToPreview", () => {
  it("only claims verification when the provider is verified", () => {
    expect(serviceToPreview(service())!.verifiedLabel).toBeUndefined();
    const verified = service({ provider: { id: "pr1", slug: "ada", displayName: "Ada", verified: true } });
    expect(serviceToPreview(verified)!.verifiedLabel).toBe("Verified provider");
  });

  it("copes with a missing provider", () => {
    expect(serviceToPreview(service({ provider: null }))!.detail).toBeUndefined();
  });
});

describe("events", () => {
  const now = new Date("2029-12-01T00:00:00Z").getTime();

  it("picks the soonest active event that hasn't ended", () => {
    const picked = pickUpcomingEvent(
      [
        event({ id: "past", endsAt: "2020-01-01T00:00:00Z" }),
        event({ id: "cancelled", status: "CANCELLED" }),
        event({ id: "later", startsAt: "2030-03-01T10:00:00Z", endsAt: "2030-03-01T12:00:00Z" }),
        event({ id: "soon" }),
      ],
      now
    );
    expect(picked?.id).toBe("soon");
  });

  it("returns nothing when no event qualifies", () => {
    expect(pickUpcomingEvent([event({ status: "CANCELLED" })], now)).toBeUndefined();
  });

  it("shows attendee count only when someone is going", () => {
    expect(eventToPreview(event())!.extra).toBe("Free entry");
    expect(eventToPreview(event({ attendeeCount: 12, minPrice: 2000 }))!.extra).toMatch(/From .*2,000 • 12 going/);
  });
});
