import { describe, expect, it } from "vitest";
import { featuredDiscountLabel, featuredMinSpendLabel } from "../featured-promotions";

describe("featured promotion labels", () => {
  it("labels a percentage discount", () => {
    expect(featuredDiscountLabel({ discountType: "PERCENTAGE", discountValue: 15 })).toBe(
      "15% off"
    );
  });

  it("labels a fixed-amount discount in naira", () => {
    const label = featuredDiscountLabel({ discountType: "FIXED_AMOUNT", discountValue: 1500 });
    expect(label).toContain("₦");
    expect(label).toContain("1,500");
    expect(label.endsWith("off")).toBe(true);
  });

  it("labels a minimum spend, or none", () => {
    expect(featuredMinSpendLabel({ minimumOrderAmount: 5000 })).toContain("5,000");
    expect(featuredMinSpendLabel({ minimumOrderAmount: null })).toBeNull();
    expect(featuredMinSpendLabel({ minimumOrderAmount: 0 })).toBeNull();
  });
});
