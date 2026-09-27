// Pure form logic for the promotion dialog: state, validation, and the
// payload sent to the API. Kept out of the component so it can be tested.

import type {
  ManagedPromotion,
  PromotionEligibility,
  PromotionInput,
  PromotionPlacement,
} from "@/types/admin";

/**
 * A promo code (percentage or fixed amount) or a featured storefront slot -
 * a product, some vendors, or a campus campaign - which has no code or
 * discount.
 */
export type PromotionFormType =
  | "percentage_discount"
  | "fixed_discount"
  | "featured_product"
  | "featured_vendor"
  | "campus_promotion";

export type TargetList = "campusIds" | "vendorIds" | "productIds" | "categoryIds";

export const MAX_FEATURED_ITEMS = 12;

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

export function isDiscountType(type: PromotionFormType): boolean {
  return type === "percentage_discount" || type === "fixed_discount";
}

/**
 * Where a type can be featured. A discount code may be left unfeatured;
 * a slot must appear somewhere. Search boost re-ranks search results, so it
 * only makes sense for products and vendors.
 */
export function placementChoicesFor(type: PromotionFormType): PromotionPlacement[] {
  switch (type) {
    case "featured_product":
    case "featured_vendor":
      return ["homepage_banner", "deals_page", "category_strip", "search_boost"];
    case "campus_promotion":
      return ["homepage_banner", "deals_page", "category_strip"];
    default:
      return ["none", "homepage_banner", "deals_page", "category_strip"];
  }
}

/** The target lists a type uses, in the order they appear in the form. */
export function targetListsFor(type: PromotionFormType): TargetList[] {
  switch (type) {
    case "featured_product":
      return ["productIds", "campusIds"];
    case "featured_vendor":
      return ["vendorIds", "campusIds"];
    case "campus_promotion":
      return ["campusIds"];
    default:
      return ["campusIds", "vendorIds", "productIds", "categoryIds"];
  }
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

const FORM_TYPES: PromotionFormType[] = [
  "percentage_discount",
  "fixed_discount",
  "featured_product",
  "featured_vendor",
  "campus_promotion",
];

export function formFromPromotion(p: ManagedPromotion): PromotionFormState {
  const blank = emptyPromotionForm();
  return {
    name: p.name,
    description: p.description,
    type: FORM_TYPES.includes(p.type as PromotionFormType)
      ? (p.type as PromotionFormType)
      : "percentage_discount",
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

/** Switching type drops targets the new type cannot use. */
export function changeType(
  form: PromotionFormState,
  type: PromotionFormType
): PromotionFormState {
  const keep = new Set(targetListsFor(type));
  const placement = placementChoicesFor(type).includes(form.placement)
    ? form.placement
    : isDiscountType(type)
      ? "none"
      : "homepage_banner";
  return {
    ...form,
    type,
    placement,
    campusIds: keep.has("campusIds") ? form.campusIds : [],
    vendorIds: keep.has("vendorIds") ? form.vendorIds : [],
    productIds: keep.has("productIds") ? form.productIds : [],
    categoryIds: keep.has("categoryIds") ? form.categoryIds : [],
  };
}

/**
 * A discount code targets products, one category or one vendor - not a
 * mix - and can additionally be limited to campuses. Picking a target
 * replaces the other kinds; vendors and categories are single-select. A
 * featured slot picks several items of its one kind.
 */
export function toggleTarget(
  form: PromotionFormState,
  list: TargetList,
  id: string
): PromotionFormState {
  if (!targetListsFor(form.type).includes(list)) return form;
  const current = form[list];
  if (current.includes(id)) {
    return { ...form, [list]: current.filter((x) => x !== id) };
  }
  if (list === "campusIds" || !isDiscountType(form.type)) {
    return { ...form, [list]: [...current, id] };
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

/** What a featured slot has to have, by type. */
const FEATURED_REQUIREMENT: Partial<
  Record<PromotionFormType, { list: TargetList; message: string }>
> = {
  featured_product: { list: "productIds", message: "Pick at least one product to feature." },
  featured_vendor: { list: "vendorIds", message: "Pick at least one vendor to feature." },
  campus_promotion: { list: "campusIds", message: "Pick at least one campus." },
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

  if (!placementChoicesFor(form.type).includes(form.placement)) {
    errors.placement =
      form.placement === "search_boost"
        ? "Search boost only works for featured products and vendors."
        : "Choose where on the storefront it should appear.";
  }

  if (!isDiscountType(form.type)) {
    const need = FEATURED_REQUIREMENT[form.type];
    if (need) {
      const picked = form[need.list].length;
      if (picked === 0) errors[need.list] = need.message;
      else if (picked > MAX_FEATURED_ITEMS) {
        errors[need.list] = `Feature at most ${MAX_FEATURED_ITEMS} at a time.`;
      }
    }
    return errors;
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
  const lists = new Set(targetListsFor(form.type));
  const pick = (list: TargetList): string[] => (lists.has(list) ? form[list] : []);
  const discount = isDiscountType(form.type);
  return {
    name: form.name.trim(),
    description: form.description.trim(),
    type: form.type,
    // A featured slot has no code, discount or limits.
    code: discount ? form.code.trim().toUpperCase() : null,
    discountValue: discount ? optionalNumber(form.discountValue) : null,
    minSpend: discount ? optionalNumber(form.minSpend) : null,
    // A cap only means something for a percentage code.
    maxDiscount:
      form.type === "percentage_discount" ? optionalNumber(form.maxDiscount) : null,
    usageLimit: discount ? optionalNumber(form.usageLimit) : null,
    perUserLimit: discount ? optionalNumber(form.perUserLimit) : null,
    eligibility: discount ? form.eligibility : "all_customers",
    placement: form.placement,
    targeting: {
      campusIds: pick("campusIds"),
      vendorIds: pick("vendorIds"),
      productIds: pick("productIds"),
      categoryIds: pick("categoryIds"),
    },
    startsAt: new Date(`${form.startDate}T00:00:00`).toISOString(),
    endsAt: new Date(`${form.endDate}T23:59:59`).toISOString(),
  };
}
