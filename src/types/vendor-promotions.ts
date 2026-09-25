// ============================================================
// VENDOR PROMOTIONS DOMAIN  (Module 13)
// ============================================================
//
// Promotions are backend-authoritative: the backend decides the status,
// stacking/priority/eligibility, discount math and usage accounting. The
// frontend never computes a final discount or decides stacking. Dates use
// platform time, never the browser clock. Records are never hard-deleted —
// cancelled/expired stay in history with their original values.

// ── Status lifecycle ─────────────────────────────────────────

export const VENDOR_PROMOTION_STATUS = {
  DRAFT: "draft",
  SCHEDULED: "scheduled",
  ACTIVE: "active",
  PAUSED: "paused",
  EXPIRED: "expired",
  CANCELLED: "cancelled",
} as const;

export type VendorPromotionStatus = ValuesOf<typeof VENDOR_PROMOTION_STATUS>;

/** Statuses the backend will transition to automatically by platform time. */
export const VENDOR_PROMOTION_TERMINAL = ["expired", "cancelled"] as const;

// ── Discount type (only what the backend/business supports) ──

export const VENDOR_PROMOTION_DISCOUNT_TYPE = {
  PERCENTAGE: "percentage",
  FIXED_AMOUNT: "fixed_amount",
} as const;

export type VendorPromotionDiscountType = ValuesOf<typeof VENDOR_PROMOTION_DISCOUNT_TYPE>;

// ── Scope ────────────────────────────────────────────────────

export const VENDOR_PROMOTION_SCOPE = {
  ALL_PRODUCTS: "all_products",
  PRODUCTS: "products",
  CATEGORY: "category",
  MINIMUM_ORDER: "minimum_order",
} as const;

export type VendorPromotionScope = ValuesOf<typeof VENDOR_PROMOTION_SCOPE>;

// ── Eligibility ──────────────────────────────────────────────

export const VENDOR_PROMOTION_ELIGIBILITY = {
  ALL: "all_customers",
  NEW: "new_customers",
  RETURNING: "returning_customers",
} as const;

export type VendorPromotionEligibility = ValuesOf<typeof VENDOR_PROMOTION_ELIGIBILITY>;

// ── Core model ───────────────────────────────────────────────

export interface VendorPromotion {
  id: string;
  /** Owning vendor — always backend-set from the authenticated identity. */
  vendorId: string;
  title: string;
  description?: string;
  status: VendorPromotionStatus;
  discountType: VendorPromotionDiscountType;
  /** percentage: 1–50 (platform cap); fixed_amount: whole naira. */
  discountValue: number;
  /** Cap on the naira value a percentage discount can give (backend rule). */
  maxDiscountAmount?: number;
  scope: VendorPromotionScope;
  /** For scope "products" — must all belong to this vendor. */
  productIds: string[];
  categoryId?: string;
  minOrderAmount?: number;
  startsAt: string;
  endsAt: string;
  eligibility: VendorPromotionEligibility;
  usageLimit?: number;
  perCustomerLimit?: number;
  /** Backend-accounted redemptions. */
  usageCount: number;
  stackable: boolean;
  createdAt: string;
  updatedAt: string;
  pausedAt?: string;
  cancelledAt?: string;
}

export interface VendorPromotionRedemption {
  id: string;
  promotionId: string;
  customerId: string;
  /** Customer's name, supplied by the API. */
  customerName?: string;
  /** Human-readable order reference; `orderId` is the route key. */
  orderNumber?: string;
  orderId?: string;
  /** Backend-computed discount amount in naira. */
  discountAmount: number;
  redeemedAt: string;
}

// ── Form input (create / edit) ───────────────────────────────

export interface VendorPromotionInput {
  title: string;
  description?: string;
  discountType: VendorPromotionDiscountType;
  discountValue: number;
  maxDiscountAmount?: number | null;
  scope: VendorPromotionScope;
  productIds: string[];
  categoryId?: string | null;
  minOrderAmount?: number | null;
  startsAt: string;
  endsAt: string;
  eligibility: VendorPromotionEligibility;
  usageLimit?: number | null;
  perCustomerLimit?: number | null;
  stackable: boolean;
}

// ── Query / pagination / counts ──────────────────────────────

export const VENDOR_PROMOTION_SORT = {
  NEWEST: "newest",
  OLDEST: "oldest",
  USAGE: "usage",
  ENDS_SOON: "ends_soon",
} as const;

export type VendorPromotionSortField = ValuesOf<typeof VENDOR_PROMOTION_SORT>;

export interface VendorPromotionQuery {
  search?: string;
  status?: VendorPromotionStatus | "all";
  sort?: VendorPromotionSortField;
  page?: number;
  pageSize?: number;
}

export interface VendorPromotionPage<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface VendorPromotionCounts {
  all: number;
  draft: number;
  scheduled: number;
  active: number;
  paused: number;
  expired: number;
  cancelled: number;
}

// ── Permission model (presentation; backend stays authoritative) ─

export const VENDOR_PROMOTION_PERMISSION_KEYS = [
  "promotions.view",
  "promotions.create",
  "promotions.manage",
  "promotions.archive",
] as const;

export type VendorPromotionPermissionKey = (typeof VENDOR_PROMOTION_PERMISSION_KEYS)[number];
export type VendorPromotionPermissions = Record<VendorPromotionPermissionKey, boolean>;

export function getDefaultVendorPromotionPermissions(): VendorPromotionPermissions {
  return {
    "promotions.view": true,
    "promotions.create": true,
    "promotions.manage": true,
    "promotions.archive": true,
  };
}

// ── Result codes (backend-authoritative) ─────────────────────

export type VendorPromotionResultCode =
  | "ok"
  | "not_found"
  | "forbidden"
  | "invalid_payload"
  | "validation_failed"
  | "invalid_transition"
  | "expired"
  | "not_active"
  | "limit_reached"
  | "already_ended";

export interface VendorPromotionResult {
  ok: boolean;
  code: VendorPromotionResultCode;
  error?: string;
  promotion?: VendorPromotion;
  /** Field-level validation messages (backend-computed). */
  errors?: Record<string, string>;
}

// ── Redemption result ────────────────────────────────────────

export interface VendorRedemptionResult {
  ok: boolean;
  redemption?: VendorPromotionRedemption;
  /** Backend-computed discounted checkout amount. */
  discountedTotal?: number;
  error?: string;
}

// ── Platform constants (backend-enforced) ────────────────────

export const VENDOR_PROMOTION_LIMITS = {
  MIN_PERCENT: 1,
  MAX_PERCENT: 50,
  MAX_ACTIVE_SLOTS: 5,
} as const;

// ── Labels (presentation maps; values stay backend-defined) ──

export const VENDOR_PROMOTION_STATUS_LABELS: Record<VendorPromotionStatus, string> = {
  draft: "Draft",
  scheduled: "Scheduled",
  active: "Active",
  paused: "Paused",
  expired: "Expired",
  cancelled: "Cancelled",
};

export const VENDOR_PROMOTION_DISCOUNT_LABELS: Record<VendorPromotionDiscountType, string> = {
  percentage: "Percentage off",
  fixed_amount: "Fixed amount off",
};

export const VENDOR_PROMOTION_SCOPE_LABELS: Record<VendorPromotionScope, string> = {
  all_products: "All products",
  products: "Selected products",
  category: "Product category",
  minimum_order: "Minimum order",
};

export const VENDOR_PROMOTION_ELIGIBILITY_LABELS: Record<VendorPromotionEligibility, string> = {
  all_customers: "All customers",
  new_customers: "New customers only",
  returning_customers: "Returning customers only",
};

type ValuesOf<T> = T[keyof T];