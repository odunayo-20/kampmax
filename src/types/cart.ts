import type { Product } from "./index";

/**
 * Rich cart domain types.
 *
 * These types model the cart independently of any backend so they can later
 * be replaced by API response types. All monetary fields shown here are for
 * *display* only; the backend remains authoritative for the final payable
 * amount during checkout.
 */

export type AvailabilityStatus =
  | "available"
  | "out_of_stock"
  | "unavailable";

export type PriceChangeStatus =
  | "unchanged"
  | "increased"
  | "decreased"
  | "changed";

export type CartItemValidationStatus =
  | "valid"
  | "price_changed"
  | "out_of_stock"
  | "unavailable"
  | "vendor_unavailable"
  | "quantity_adjusted";

export type DeliveryReadiness =
  | "available"
  | "unavailable"
  | "pending"
  | "error";

/**
 * A single line in the cart.
 *
 * `product` and `quantity` mirror the legacy in-app `CartItem` so the many
 * existing consumers keep working; the extra fields add the richer cart
 * behaviour this module requires (variants, availability, validation).
 */
export interface CartLineItem {
  /** Local, stable id for this cart line. */
  id: string;
  productId: string;
  vendorId: string;
  product: Product;
  quantity: number;
  /** Display label for the selected variant, e.g. "Storage: 256GB · Color: Silver". */
  variantLabel?: string;
  /** Selected variant values keyed by variant group id. */
  selectedVariants?: Record<string, string>;
  /** Selected variation pair { name, option } compatible with backend. */
  selectedVariation?: { name: string; option: string } | null;
  /** Sent to "Save for later" rather than the active cart. */
  savedForLater?: boolean;
  /** Client-relevant availability / stock constraints. */
  availableStock?: number;
  maxPurchaseQuantity?: number;
  availabilityStatus?: AvailabilityStatus;
  validationStatus?: CartItemValidationStatus;
  /** Human-friendly message surfaced next to the line when the status is not valid. */
  message?: string;
  /** Authoritative unit price last confirmed by the backend. */
  unitPrice?: number;
}

export interface CartVendorDelivery {
  deliveryAvailable: boolean;
  deliveryMethod?: string;
  deliveryFee?: number;
  estimatedDelivery?: string;
  status: DeliveryReadiness;
  /** Only when `status === "error"`. */
  errorMessage?: string;
}

/** Items in the cart grouped by vendor. */
export interface CartVendorGroup {
  vendorId: string;
  vendorName?: string;
  vendorLogo?: string;
  verified?: boolean;
  items: CartLineItem[];
  subtotal: number;
  delivery: CartVendorDelivery;
}

export interface CartPricingSummary {
  itemsSubtotal: number;
  deliveryFee: number;
  discountTotal: number;
  total: number;
  itemCount: number;
}

/** Full cart document (mirrors a future GET /cart response). */
export interface Cart {
  id: string;
  customerId?: string;
  campusId?: string;
  items: CartLineItem[];
  savedItems: CartLineItem[];
  subtotal: number;
  deliveryTotal: number;
  discountTotal: number;
  total: number;
  currency: "NGN";
  updatedAt: string;
}

/** Outcome of merging a guest cart with an authenticated server cart. */
export interface CartMergeResult {
  mergedItems: CartLineItem[];
  /** Lines whose quantity had to be adjusted to respect a limit. */
  adjustments: Array<{ productId: string; from: number; to: number; reason: string }>;
  removedItems: string[];
}

/**
 * Coupon funding/impact model. Only the *structure* of coupon redemption is
 * modelled; actual validation outcomes must come from the backend.
 */
export type CouponValidationStatus =
  | "valid"
  | "invalid"
  | "expired"
  | "vendor_specific"
  | "product_specific"
  | "minimum_not_reached"
  | "already_used"
  | "not_applicable";
