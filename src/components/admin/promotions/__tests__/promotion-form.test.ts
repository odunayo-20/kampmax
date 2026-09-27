import { describe, expect, it } from "vitest";
import type { ManagedPromotion } from "@/types/admin";
import {
  buildPromotionInput,
  emptyPromotionForm,
  formFromPromotion,
  toggleTarget,
  validatePromotionForm,
  type PromotionFormState,
} from "../promotion-form";

const valid = (over: Partial<PromotionFormState> = {}): PromotionFormState => ({
  ...emptyPromotionForm(new Date("2026-10-01T09:00:00")),
  name: "Back to campus",
  code: "campus15",
  discountValue: "15",
  ...over,
});

const promotion = (over: Partial<ManagedPromotion> = {}): ManagedPromotion => ({
  id: "p1",
  name: "Autumn push",
  description: "Note",
  type: "fixed_discount",
  status: "draft",
  code: "AUTUMN",
  discountValue: 500,
  minSpend: 2000,
  maxDiscount: null,
  perUserLimit: 1,
  eligibility: "new_customers",
  placement: "homepage_banner",
  targeting: { campusIds: ["c1"], vendorIds: [], productIds: [], categoryIds: [] },
  usageCount: 0,
  usageLimit: 100,
  startsAt: "2026-10-01T00:00:00.000Z",
  endsAt: "2026-10-31T00:00:00.000Z",
  createdAt: "2026-09-01T00:00:00.000Z",
  updatedAt: "2026-09-01T00:00:00.000Z",
  ...over,
});

describe("validatePromotionForm", () => {
  it("accepts a complete percentage code", () => {
    expect(validatePromotionForm(valid())).toEqual({});
  });

  it("needs a name and a code of at least four characters", () => {
    const errors = validatePromotionForm(valid({ name: "ab", code: "abc" }));
    expect(errors.name).toBeDefined();
    expect(errors.code).toBeDefined();
  });

  it("keeps percentages between 1 and 90", () => {
    expect(validatePromotionForm(valid({ discountValue: "95" })).discountValue).toMatch(/1 and 90/);
    expect(validatePromotionForm(valid({ discountValue: "0" })).discountValue).toBeDefined();
  });

  it("requires fixed discounts of at least N100", () => {
    const errors = validatePromotionForm(valid({ type: "fixed_discount", discountValue: "50" }));
    expect(errors.discountValue).toMatch(/N100/);
    expect(
      validatePromotionForm(valid({ type: "fixed_discount", discountValue: "100" }))
    ).toEqual({});
  });

  it("requires the end date to be after the start date", () => {
    const errors = validatePromotionForm(valid({ startDate: "2026-10-10", endDate: "2026-10-01" }));
    expect(errors.endDate).toBeDefined();
  });

  it("keeps the per-customer limit within the total limit", () => {
    const errors = validatePromotionForm(valid({ usageLimit: "3", perUserLimit: "5" }));
    expect(errors.perUserLimit).toMatch(/exceed/);
    expect(validatePromotionForm(valid({ usageLimit: "5", perUserLimit: "5" }))).toEqual({});
  });

  it("rejects a usage limit below 1", () => {
    expect(validatePromotionForm(valid({ usageLimit: "0" })).usageLimit).toBeDefined();
  });

  it("only checks the discount cap on percentage codes", () => {
    expect(validatePromotionForm(valid({ maxDiscount: "0" })).maxDiscount).toBeDefined();
    expect(
      validatePromotionForm(valid({ type: "fixed_discount", discountValue: "500", maxDiscount: "0" }))
    ).toEqual({});
  });
});

describe("buildPromotionInput", () => {
  it("upper-cases the code and converts numbers", () => {
    const input = buildPromotionInput(valid({ minSpend: "5000", usageLimit: "200", perUserLimit: "1" }));
    expect(input).toMatchObject({
      name: "Back to campus",
      code: "CAMPUS15",
      type: "percentage_discount",
      discountValue: 15,
      minSpend: 5000,
      usageLimit: 200,
      perUserLimit: 1,
      eligibility: "all_customers",
      placement: "none",
    });
  });

  it("sends null for blank optional fields", () => {
    expect(buildPromotionInput(valid())).toMatchObject({
      minSpend: null,
      maxDiscount: null,
      usageLimit: null,
      perUserLimit: null,
    });
  });

  it("drops the cap when the code is a fixed amount", () => {
    const input = buildPromotionInput(
      valid({ type: "fixed_discount", discountValue: "500", maxDiscount: "300" })
    );
    expect(input.maxDiscount).toBeNull();
  });

  it("keeps the cap on a percentage code", () => {
    expect(buildPromotionInput(valid({ maxDiscount: "2000" })).maxDiscount).toBe(2000);
  });

  it("carries the placement, eligibility and targeting", () => {
    const input = buildPromotionInput(
      valid({
        placement: "deals_page",
        eligibility: "returning_customers",
        campusIds: ["c1"],
        vendorIds: ["v1"],
      })
    );
    expect(input).toMatchObject({
      placement: "deals_page",
      eligibility: "returning_customers",
      targeting: { campusIds: ["c1"], vendorIds: ["v1"], productIds: [], categoryIds: [] },
    });
  });

  it("builds an end-of-day end time", () => {
    const input = buildPromotionInput(valid({ startDate: "2026-10-01", endDate: "2026-10-31" }));
    expect(new Date(input.endsAt).getHours()).toBe(23);
    expect(new Date(input.startsAt).getHours()).toBe(0);
  });
});

describe("toggleTarget", () => {
  it("selects several products", () => {
    let form = valid();
    form = toggleTarget(form, "productIds", "p1");
    form = toggleTarget(form, "productIds", "p2");
    expect(form.productIds).toEqual(["p1", "p2"]);
  });

  it("deselects a chosen item", () => {
    const form = toggleTarget(toggleTarget(valid(), "productIds", "p1"), "productIds", "p1");
    expect(form.productIds).toEqual([]);
  });

  it("allows only one vendor", () => {
    let form = toggleTarget(valid(), "vendorIds", "v1");
    form = toggleTarget(form, "vendorIds", "v2");
    expect(form.vendorIds).toEqual(["v2"]);
  });

  it("allows only one category", () => {
    let form = toggleTarget(valid(), "categoryIds", "k1");
    form = toggleTarget(form, "categoryIds", "k2");
    expect(form.categoryIds).toEqual(["k2"]);
  });

  it("switching target kind clears the others", () => {
    let form = toggleTarget(valid(), "productIds", "p1");
    form = toggleTarget(form, "vendorIds", "v1");
    expect(form.productIds).toEqual([]);
    expect(form.vendorIds).toEqual(["v1"]);
  });

  it("campuses combine with any target kind", () => {
    let form = toggleTarget(valid(), "vendorIds", "v1");
    form = toggleTarget(form, "campusIds", "c1");
    form = toggleTarget(form, "campusIds", "c2");
    expect(form.vendorIds).toEqual(["v1"]);
    expect(form.campusIds).toEqual(["c1", "c2"]);
    form = toggleTarget(form, "productIds", "p1");
    expect(form.campusIds).toEqual(["c1", "c2"]);
    expect(form.vendorIds).toEqual([]);
  });
});

describe("formFromPromotion", () => {
  it("loads an existing promotion into the form", () => {
    const form = formFromPromotion(promotion());
    expect(form).toMatchObject({
      name: "Autumn push",
      type: "fixed_discount",
      code: "AUTUMN",
      discountValue: "500",
      minSpend: "2000",
      maxDiscount: "",
      usageLimit: "100",
      perUserLimit: "1",
      eligibility: "new_customers",
      placement: "homepage_banner",
      campusIds: ["c1"],
    });
  });

  it("round-trips through the payload builder", () => {
    const input = buildPromotionInput(formFromPromotion(promotion()));
    expect(input).toMatchObject({
      code: "AUTUMN",
      discountValue: 500,
      minSpend: 2000,
      usageLimit: 100,
      perUserLimit: 1,
      placement: "homepage_banner",
    });
  });

  it("gives a promotion with no end date a default end date", () => {
    const form = formFromPromotion(promotion({ endsAt: null }));
    expect(form.endDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
