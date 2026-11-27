import { describe, expect, it } from "vitest";
import { listingMatches, listingStatus, placeLine, rentLine } from "./agent-listings";

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
