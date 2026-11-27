import { describe, expect, it } from "vitest";
import {
  availabilityText,
  chargeRows,
  contactProblem,
  describeHousingError,
  enquiryProblem,
  existingEnquiryId,
  factsText,
  memberSinceText,
  photosOf,
  placeText,
  rentText,
  reportProblem,
} from "./accommodation-text";

describe("listing page rules", () => {
  it("keeps only photos over a secure link", () => {
    const kept = photosOf([
      { url: "https://a/1.jpg", type: "IMAGE" },
      { url: "https://a/2.mp4", type: "VIDEO" },
      { url: "http://a/3.jpg", type: "IMAGE" },
    ]);
    expect(kept.length).toBe(1);
  });

  it("lists the charges that apply and the total", () => {
    const rows = chargeRows({ rent: 200000, cautionFee: 0, agencyFee: 20000, agreementFee: 0, otherCharges: 0, totalUpfront: 220000 });
    expect(rows.map((r) => r.label)).toEqual(["Rent", "Agency fee", "Total to pay up front"]);
    expect(rows[2]).toMatchObject({ value: "₦220,000", bold: true });
  });

  it("says when the agent last confirmed it is free, and since when they are an agent", () => {
    const now = Date.parse("2026-11-26T12:00:00Z");
    expect(availabilityText("2026-11-23T12:00:00Z", now)).toBe("Agent confirmed it is available 3 days ago");
    expect(availabilityText(null, now)).toBeNull();
    expect(memberSinceText("2025-03-10T00:00:00Z")).toBe("Agent since March 2025");
  });

  it("checks the enquiry, the contact choice and the report before sending", () => {
    expect(enquiryProblem("Hi")).toMatch(/at least 10/);
    expect(enquiryProblem("Is it still free next month?")).toBeNull();
    expect(contactProblem("PHONE", { phone: "" })).toMatch(/phone number/);
    expect(contactProblem("IN_APP", null)).toBeNull();
    expect(reportProblem("", "", ["FRAUD", "OTHER"])).toMatch(/Choose why/);
    expect(reportProblem("OTHER", "bad", ["FRAUD", "OTHER"])).toMatch(/Tell us a little/);
    expect(reportProblem("FRAUD", "", ["FRAUD", "OTHER"])).toBeNull();
    expect(existingEnquiryId({ data: { enquiryId: "3f2b1c4e-1a2b-4c3d-8e9f-0a1b2c3d4e5f" } })).toBe("3f2b1c4e-1a2b-4c3d-8e9f-0a1b2c3d4e5f");
    expect(describeHousingError({ status: 409, message: "You already asked about this place." })).toBe("You already asked about this place.");
    expect(describeHousingError({ status: 500, message: "boom" })).toMatch(/didn't go through/);
  });
});

describe("accommodation text", () => {
  it("says the rent in words, not the server's code", () => {
    expect(rentText({ rentAmount: 250000, paymentFrequency: "PER_SEMESTER" })).toBe("₦250,000 a semester");
    expect(rentText({ rentAmount: 250000, paymentFrequency: "ANNUALLY" })).toBe("₦250,000 a year");
    expect(rentText({ rentAmount: 5000, paymentFrequency: "SOMETHING_NEW" })).toBe("₦5,000");
  });

  it("lists the area and the facts plainly", () => {
    expect(placeText({ neighbourhood: "Akoka", city: "Yaba", state: "Lagos" })).toBe("Akoka, Yaba, Lagos");
    expect(placeText({ neighbourhood: null, city: "Yaba", state: " " })).toBe("Yaba");
    expect(factsText({ bedrooms: 1, bathrooms: 1, furnishingStatus: "SEMI_FURNISHED" })).toBe("1 bed · 1 bath · Partly furnished");
    expect(factsText({ bedrooms: 0, bathrooms: 1, furnishingStatus: "UNKNOWN" })).toBe("Studio · 1 bath");
  });
});
