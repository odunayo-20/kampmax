import { describe, expect, it } from "vitest";
import { canRenewNow, choosablePackages, packageLabel, renewalAction, safeCheckoutUrl, subscriptionView } from "./agent-billing";
import { canArchiveListing, canResubmit, joinAnd, listingTip, missingOnListing } from "./agent-listings";

const naira = (n: number) => `₦${n.toLocaleString("en-NG")}`;

describe("listing billing", () => {
  it("opens only a clean https checkout link", () => {
    expect(safeCheckoutUrl("https://checkout.paystack.com/abc")).toBe("https://checkout.paystack.com/abc");
    expect(safeCheckoutUrl("javascript:alert(1)")).toBeNull();
    expect(safeCheckoutUrl("http://checkout.paystack.com/abc")).toBeNull();
    expect(safeCheckoutUrl("https://user:pw@evil.com/")).toBeNull();
  });

  it("words packages and subscriptions", () => {
    expect(packageLabel({ name: "Standard", price: 5000, durationDays: 90 }, naira)).toBe("Standard · ₦5,000 for 3 months");
    const list = [
      { id: "b", name: "B", description: null, price: 9000, currency: "NGN", durationDays: 30, isActive: true },
      { id: "a", name: "A", description: null, price: 1000, currency: "NGN", durationDays: 30, isActive: true },
      { id: "c", name: "C", description: null, price: 0, currency: "NGN", durationDays: 30, isActive: false },
    ];
    expect(choosablePackages(list).map((p) => p.id)).toEqual(["a", "b"]);
    expect(subscriptionView({ status: "PAST_DUE", autoRenew: true, endsAt: null }).label).toBe("Payment failed");
  });

  it("allows renewing only in the last week or after it lapses", () => {
    const now = new Date("2026-11-27T12:00:00Z");
    expect(canRenewNow({ status: "ACTIVE", endsAt: "2026-12-30T00:00:00Z" }, now)).toBe(false);
    expect(canRenewNow({ status: "ACTIVE", endsAt: "2026-12-02T00:00:00Z" }, now)).toBe(true);
    expect(canRenewNow({ status: "EXPIRED", endsAt: null }, now)).toBe(true);
    expect(renewalAction({ status: "EXPIRED", autoRenew: false })).toBeNull();
  });
});

describe("what a listing allows", () => {
  const sub = (status: string) => ({ id: "s", status, amount: 0, autoRenew: false, endsAt: null });
  it("resubmits only with a running paid period, and archives only with no package in play", () => {
    expect(canResubmit({ moderationStatus: "REJECTED", subscription: sub("ACTIVE") })).toBe(true);
    expect(canResubmit({ moderationStatus: "REJECTED", subscription: null })).toBe(false);
    expect(canArchiveListing({ subscription: sub("PENDING_PAYMENT") })).toBe(true);
    expect(canArchiveListing({ subscription: sub("ACTIVE") })).toBe(false);
  });

  it("says what a draft lacks and gives one tip", () => {
    expect(joinAnd(missingOnListing({ title: "Room", description: "", rentAmount: 0, media: [] }))).toBe("a description, the rent and at least one photo");
    expect(listingTip({ media: [], description: "", stats: undefined })).toMatch(/This one has 0/);
  });
});
