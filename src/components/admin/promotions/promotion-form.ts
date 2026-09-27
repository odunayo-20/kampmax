// Pure form logic for the promotion dialog: state, validation, and the
// payload sent to the API. Kept out of the component so it can be tested.

import type {
  ManagedPromotion,
  PromotionEligibility,
  PromotionInput,
  PromotionPlacement,
} from "@/types/admin";

export type PromotionFormType = "percentage_discount" | "fixed_discount";

export type TargetList = "campusIds" | "vendorIds" | "productIds" | "categoryIds";

export interface PromotionFormState {
  name: string;
  description: string;
  type: PromotionFormType;
  code: string;
  discountValue: string;
  minSpend: string;
  maxDiscount: string;
  usageLimit: string;
  perUserLimit: string;
  eligibility: PromotionEligibility;
  placement: PromotionPlacement;
  startDate: string;
  endDate: string;
  campusIds: string[];
  vendorIds: string[];
  productIds: string[];
  categoryIds: string[];
}

/** yyyy-mm-dd in the browser's local time. */
export function toDateInput(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function emptyPromotionForm(now: Date = new Date()): PromotionFormState {
  const inTwoWeeks = new Date(now.getTime() + 14 * 24 * 3600 * 1000);
  return {
    name: "",
    description: "",
    type: "percentage_discount",
    code: "",
    discountValue: "",
    minSpend: "",
    maxDiscount: "",
    usageLimit: "",
    perUserLimit: "",
    eligibility: "all_customers",
    placement: "none",
    startDate: toDateInput(now),
    endDate: toDateInput(inTwoWeeks),
    campusIds: [],
    vendorIds: [],
    productIds: [],
    categoryIds: [],
  };
}

const numText = (n: number | null | undefined): string =>
  n != null ? String(n) : "";

export function formFromPromotion(p: ManagedPromotion): PromotionFormState {
  const blank = emptyPromotionForm();
  return {
    name: p.name,
    description: p.description,
    type: p.type === "fixed_discount" ? "fixed_discount" : "percentage_discount",
    code: p.code ?? "",
    discountValue: numText(p.discountValue),
    minSpend: numText(p.minSpend),
    maxDiscount: numText(p.maxDiscount),
    usageLimit: numText(p.usageLimit),
    perUserLimit: numText(p.perUserLimit),
    eligibility: p.eligibility ?? "all_customers",
    placement: p.placement,
    startDate: toDateInput(new Date(p.startsAt)),
    endDate: p.endsAt ? toDateInput(new Date(p.endsAt)) : blank.endDate,
    campusIds: [...p.targeting.campusIds],
    vendorIds: [...p.targeting.vendorIds],
    productIds: [...p.targeting.productIds],
    categoryIds: [...p.targeting.categoryIds],
  };
}

/**
 * A code targets products, one category or one vendor - not a mix - and can
 * additionally be limited to campuses. Picking a target replaces the other
 * kinds; vendors and categories are single-select.
 */
export function toggleTarget(
  form: PromotionFormState,
  list: TargetList,
  id: string
): PromotionFormState {
  const current = form[list];
  if (current.includes(id)) {
    return { ...form, [list]: current.filter((x) => x !== id) };
  }
  if (list === "campusIds") {
    return { ...form, campusIds: [...current, id] };
  }
  return {
    ...form,
    vendorIds: [],
    productIds: [],
    categoryIds: [],
    [list]: list === "productIds" ? [...current, id] : [id],
  };
}

const optionalNumber = (s: string): number | null => {
  if (!s.trim()) return null;
  const n = Number(s);
  return Number.isNaN(n) ? null : n;
};

export function validatePromotionForm(
  form: PromotionFormState
): Record<string, string> {
  const errors: Record<string, string> = {};
  if (form.name.trim().length < 3) {
    errors.name = "Give the promotion a name (at least 3 characters).";
  }
  if (new Date(form.endDate).getTime() <= new Date(form.startDate).getTime()) {
    errors.endDate = "End date must be after the start date.";
  }

  const value = Number(form.discountValue);
  if (!form.discountValue || Number.isNaN(value)) {
    errors.discountValue =
      form.type === "fixed_discount"
        ? "Enter the naira amount to knock off."
        : "Enter a discount percentage.";
  } else if (form.type === "percentage_discount" && (value < 1 || value > 90)) {
    errors.discountValue = "Percentage must be between 1 and 90.";
  } else if (form.type === "fixed_discount" && value < 100) {
    errors.discountValue = "Fixed discounts start from N100.";
  }

  if (form.code.trim().length < 4) {
    errors.code = "Codes need at least 4 characters (e.g. CAMPUS15).";
  }

  const usage = optionalNumber(form.usageLimit);
  if (form.usageLimit.trim() && (usage === null || usage < 1)) {
    errors.usageLimit = "Usage limit must be at least 1.";
  }
  const perUser = optionalNumber(form.perUserLimit);
  if (form.perUserLimit.trim() && (perUser === null || perUser < 1)) {
    errors.perUserLimit = "Must be at least 1.";
  } else if (perUser !== null && usage !== null && perUser > usage) {
    errors.perUserLimit = "Can't exceed the total usage limit.";
  }
  const cap = optionalNumber(form.maxDiscount);
  if (
    form.type === "percentage_discount" &&
    form.maxDiscount.trim() &&
    (cap === null || cap < 1)
  ) {
    errors.maxDiscount = "Enter a naira cap of at least 1.";
  }
  return errors;
}

export function buildPromotionInput(form: PromotionFormState): PromotionInput {
  return {
    name: form.name.trim(),
    description: form.description.trim(),
    type: form.type,
    code: form.code.trim().toUpperCase(),
    discountValue: optionalNumber(form.discountValue),
    minSpend: optionalNumber(form.minSpend),
    // A cap only means something for a percentage code.
    maxDiscount:
      form.type === "percentage_discount" ? optionalNumber(form.maxDiscount) : null,
    usageLimit: optionalNumber(form.usageLimit),
    perUserLimit: optionalNumber(form.perUserLimit),
    eligibility: form.eligibility,
    placement: form.placement,
    targeting: {
      campusIds: form.campusIds,
      vendorIds: form.vendorIds,
      productIds: form.productIds,
      categoryIds: form.categoryIds,
    },
    startsAt: new Date(`${form.startDate}T00:00:00`).toISOString(),
    endsAt: new Date(`${form.endDate}T23:59:59`).toISOString(),
  };
}
