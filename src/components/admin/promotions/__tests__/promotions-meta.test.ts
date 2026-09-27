import { describe, expect, it } from "vitest";
import { clickRate, promotionUsageLabel } from "../promotions-meta";
import {
  buildPromotionInput,
  changeType,
  emptyPromotionForm,
  placementChoicesFor,
  validatePromotionForm,
} from "../promotion-form";

describe("clickRate", () => {
  it("is a share of views", () => {
    expect(clickRate(200, 5)).toBe("2.5%");
    expect(clickRate(3, 1)).toBe("33.3%");
  });

  it("is null before anything was shown", () => {
    expect(clickRate(0, 0)).toBeNull();
  });
});

describe("promotionUsageLabel", () => {
  it("shows redemptions for a code, with its limit", () => {
    expect(
      promotionUsageLabel({ type: "percentage_discount", usageCount: 4, usageLimit: 50 })
    ).toBe("4 / 50");
    expect(
      promotionUsageLabel({ type: "fixed_discount", usageCount: 4, usageLimit: null })
    ).toBe("4");
  });

  it("shows views and clicks for a featured slot", () => {
    for (const type of ["featured_product", "featured_vendor", "campus_promotion"] as const) {
      expect(
        promotionUsageLabel({ type, usageCount: 0, usageLimit: null, views: 120, clicks: 9 })
      ).toBe("120 views · 9 clicks");
    }
  });

  it("treats missing stats as zero", () => {
    expect(
      promotionUsageLabel({ type: "featured_product", usageCount: 0, usageLimit: null })
    ).toBe("0 views · 0 clicks");
  });
});

describe("placementChoicesFor", () => {
  it("lets a code go unfeatured, or into the home, deals or category slots", () => {
    expect(placementChoicesFor("percentage_discount")).toEqual([
      "none",
      "homepage_banner",
      "deals_page",
      "category_strip",
    ]);
    expect(placementChoicesFor("fixed_discount")).toContain("none");
    expect(placementChoicesFor("fixed_discount")).not.toContain("search_boost");
  });

  it("offers search boost only for products and vendors", () => {
    expect(placementChoicesFor("featured_product")).toContain("search_boost");
    expect(placementChoicesFor("featured_vendor")).toContain("search_boost");
    expect(placementChoicesFor("campus_promotion")).not.toContain("search_boost");
  });

  it("never lets a featured slot go unfeatured", () => {
    for (const type of ["featured_product", "featured_vendor", "campus_promotion"] as const) {
      expect(placementChoicesFor(type)).not.toContain("none");
    }
  });
});

describe("placement rules in the form", () => {
  const featured = () => ({
    ...emptyPromotionForm(new Date("2026-10-01T09:00:00")),
    name: "Boost lamps",
    type: "featured_product" as const,
    placement: "search_boost" as const,
    productIds: ["p1"],
  });

  it("accepts search boost on a featured product", () => {
    expect(validatePromotionForm(featured())).toEqual({});
    expect(buildPromotionInput(featured()).placement).toBe("search_boost");
  });

  it("rejects search boost on a campus campaign or a code", () => {
    const campaign = { ...featured(), type: "campus_promotion" as const, campusIds: ["c1"] };
    expect(validatePromotionForm(campaign).placement).toMatch(/Search boost/);
    const code = {
      ...emptyPromotionForm(new Date("2026-10-01T09:00:00")),
      name: "Save 15",
      code: "SAVE15",
      discountValue: "15",
      placement: "search_boost" as const,
    };
    expect(validatePromotionForm(code).placement).toMatch(/Search boost/);
  });

  it("allows the category strip for any type", () => {
    const code = {
      ...emptyPromotionForm(new Date("2026-10-01T09:00:00")),
      name: "Save 15",
      code: "SAVE15",
      discountValue: "15",
      placement: "category_strip" as const,
    };
    expect(validatePromotionForm(code)).toEqual({});
  });

  it("resets an invalid placement when the type changes", () => {
    expect(changeType(featured(), "campus_promotion").placement).toBe("homepage_banner");
    expect(changeType(featured(), "percentage_discount").placement).toBe("none");
    expect(changeType({ ...featured(), placement: "deals_page" }, "campus_promotion").placement).toBe(
      "deals_page"
    );
  });
});
