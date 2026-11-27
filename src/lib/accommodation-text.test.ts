import { describe, expect, it } from "vitest";
import { factsText, placeText, rentText } from "./accommodation-text";

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
