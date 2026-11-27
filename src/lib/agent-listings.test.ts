import { describe, expect, it } from "vitest";
import type { AccommodationListing } from "@/types/accommodation";
import {
  emptyListing,
  formFromListing,
  freeRooms,
  listingMatches,
  listingPatch,
  listingProblems,
  listingStatus,
  placeLine,
  rentLine,
  sendsBackForReview,
  suggestedTitle,
  totalUpfront,
} from "./agent-listings";

describe("the listing form", () => {
  const live: AccommodationListing = {
    id: "l1", propertyId: "p", unitId: "u", title: "Room at Hill House", description: "Near the gate", rentAmount: 200000, currency: "NGN",
    paymentFrequency: "ANNUALLY", cautionFee: 0, agencyFee: 10000, agreementFee: 0, otherCharges: 0, totalUpfrontCost: 210000,
    moderationStatus: "APPROVED", publicationStatus: "ACTIVE", availabilityStatus: "AVAILABLE", rejectionReason: null, submittedAt: null,
    approvedAt: null, expiresAt: null, lastAvailabilityConfirmedAt: null, unit: null, property: null,
    media: [{ id: "m", mediaId: "a", url: "https://x/a.jpg", caption: null }], amenities: [{ id: "w", name: "Water" }], subscription: null,
    createdAt: "", updatedAt: "",
  };

  it("checks amounts and the title, and adds up what students pay", () => {
    const f = { ...emptyListing(), title: "Hi", rentAmount: "₦250,000", agencyFee: "abc" };
    expect(Object.keys(listingProblems(f)).sort()).toEqual(["agencyFee", "title"]);
    expect(totalUpfront({ ...f, agencyFee: "20000.50" })).toBe(270000.5);
  });

  it("sends only what changed, and warns when a live listing goes back for review", () => {
    const f = formFromListing(live);
    expect(listingPatch(f, live)).toEqual({});
    const facilities = listingPatch({ ...f, amenityIds: [] }, live);
    expect(facilities).toEqual({ amenityIds: [] });
    expect(sendsBackForReview(live, facilities)).toBe(false);
    const price = listingPatch({ ...f, rentAmount: "220000" }, live);
    expect(price).toEqual({ rentAmount: 220000 });
    expect(sendsBackForReview(live, price)).toBe(true);
  });

  it("offers only rooms without a listing, with a starting title", () => {
    const props = [{ id: "p", title: "Hill House", units: [{ id: "u", unitName: "Room 1", unitType: "Self-contain" }, { id: "v", unitName: "Room 2", unitType: "Room" }] }];
    const rooms = freeRooms(props, [{ unitId: "u" }]);
    expect(rooms.map((r) => r.id)).toEqual(["v"]);
    expect(suggestedTitle(rooms[0].unit, rooms[0].property)).toBe("Room at Hill House");
  });
});

const naira = (n: number) => `₦${n.toLocaleString("en-NG")}`;
const base = { moderationStatus: "APPROVED", publicationStatus: "ACTIVE", availabilityStatus: "AVAILABLE", rejectionReason: null, expiresAt: null, subscription: null } as const;

describe("the agent's listings", () => {
  it("reads the two statuses together", () => {
    expect(listingStatus(base).label).toBe("Live");
    expect(listingStatus({ ...base, publicationStatus: "EXPIRED" }).label).toBe("Expired");
    expect(listingStatus({ ...base, publicationStatus: "INACTIVE" as never, availabilityStatus: "OCCUPIED" }).text).toMatch(/not available/);
    expect(listingStatus({ ...base, moderationStatus: "REJECTED", rejectionReason: " Blurry photos " }).text).toBe("Kampmax asked for changes: Blurry photos");
  });

  it("puts anything that needs the agent under Needs you", () => {
    expect(listingMatches({ ...base, moderationStatus: "REJECTED" }, "attention")).toBe(true);
    expect(listingMatches({ ...base, subscription: { id: "s", status: "PAST_DUE", amount: 0, autoRenew: true, endsAt: null } }, "attention")).toBe(true);
    expect(listingMatches(base, "attention")).toBe(false);
    expect(listingMatches(base, "live")).toBe(true);
  });

  it("words the rent and place for a card", () => {
    expect(rentLine({ rentAmount: 250000, paymentFrequency: "ANNUALLY" }, naira)).toBe("₦250,000 per year");
    expect(rentLine({ rentAmount: 0, paymentFrequency: "ANNUALLY" }, naira)).toBe("Rent not set");
    expect(placeLine({ property: { id: "p", title: "Sunrise Lodge", city: "", state: "" }, unit: { id: "u", unitName: "Room 4", unitType: "" } })).toBe("Sunrise Lodge · Room 4");
  });
});
