import type { CartLineItem } from "./cart";

// Every amount here is for display only: the backend re-prices the order and
// is the authority on discounts, delivery fees and payment status.

export type CheckoutDeliveryMethod =
  | "campus_delivery"
  | "campus_pickup"
  | "vendor_pickup";

export const CHECKOUT_DELIVERY_METHOD_LABELS: Record<CheckoutDeliveryMethod, string> = {
  campus_delivery: "Campus Delivery",
  campus_pickup: "Campus Pickup",
  vendor_pickup: "Seller Pickup",
};

/** A single optional delivery method for one vendor group. */
export interface VendorDeliveryOption {
  id: string; // e.g. "vendorId:campus_delivery"
  method: CheckoutDeliveryMethod;
  label: string;
  fee: number;
  estimatedDelivery?: string;
  state: "available" | "unavailable";
  /** Why it is unavailable. */
  message?: string;
}

/** Each vendor in a multi-vendor cart has its own delivery choice. */
export interface VendorDeliverySelection {
  vendorId: string;
  method: CheckoutDeliveryMethod;
  optionId: string;
  fee: number;
  estimatedDelivery?: string;
}

/** What a vendor offers, as set in their "Delivery & pickup" store settings. */
export interface VendorDeliveryOffer {
  vendorId: string;
  deliveryAvailable: boolean;
  pickupAvailable: boolean;
  prepTimeMinutes: number;
  deliveryFee: number;
  pickupLocation: string | null;
}

export type CouponCheckoutStatus =
  | "idle"
  | "loading"
  | "valid"
  | "invalid"
  | "expired"
  | "minimum_not_reached"
  | "vendor_specific"
  | "product_specific"
  | "already_used"
  | "not_applicable";

export interface CouponState {
  code: string;
  status: CouponCheckoutStatus;
  message?: string;
  appliedDiscount?: number;
}

export type CheckoutPaymentMethod = "paystack" | "wallet";

export interface CheckoutVendorGroup {
  vendorId: string;
  vendorName: string;
  vendorVerified: boolean;
  items: CartLineItem[];
  subtotal: number;
  deliveryOptions: VendorDeliveryOption[];
  /** null when the vendor offers no usable method. */
  selectedDelivery: VendorDeliverySelection | null;
}

export interface CheckoutPricing {
  itemsSubtotal: number;
  deliveryTotal: number;
  discountTotal: number;
  finalTotal: number;
  itemCount: number;
}

/** The cart as the checkout page shows it: grouped by seller and priced. */
export interface CheckoutSummary {
  vendorGroups: CheckoutVendorGroup[];
  pricing: CheckoutPricing;
}

/**
 * placing: creating the orders. paying: charging the wallet or starting
 * Paystack. leaving: it worked and the page is navigating away.
 */
export type CheckoutPhase = "idle" | "placing" | "paying" | "leaving" | "failed";

export interface CheckoutCustomer {
  fullName: string;
  email: string;
  phone: string;
}
