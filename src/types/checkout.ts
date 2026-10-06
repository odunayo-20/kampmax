import type { Campus } from "./index";
import type { CartLineItem } from "./cart";

// ============================================================
// CHECKOUT DOMAIN TYPES
// ============================================================
//
// These types model the checkout independently of a backend so they map 1:1
// to the future Kampmax checkout API. The naming mirrors the API contract the
// module describes (session, delivery, payment, coupon, coin).
//
// SECURITY NOTE: Nothing here is authoritative for the final financial
// transaction. Every amount shown is for *display only*; the backend must
// recalculate and confirm the payable total, discounts, coin, escrow, and
// payment status.

export type CheckoutDeliveryMethod =
  | "campus_delivery"
  | "campus_pickup"
  | "vendor_pickup";

export const CHECKOUT_DELIVERY_METHOD_LABELS: Record<CheckoutDeliveryMethod, string> = {
  campus_delivery: "Campus Delivery",
  campus_pickup: "Campus Pickup",
  vendor_pickup: "Vendor Pickup",
};

export type DeliveryOptionState = "loading" | "available" | "unavailable" | "error";

/** A single optional delivery method for one vendor group. */
export interface VendorDeliveryOption {
  id: string; // e.g. "campus_delivery" | "vendor_pickup"
  method: CheckoutDeliveryMethod;
  label: string;
  fee: number; // display only; backend authoritative
  estimatedDelivery?: string;
  state: DeliveryOptionState;
  /** When state === "error" or "unavailable". */
  message?: string;
}

/**
 * Delivery selection for a single vendor. Each vendor in a multi-vendor cart
 * has its own delivery choice; we never assume one method applies to the
 * whole order.
 */
export interface VendorDeliverySelection {
  vendorId: string;
  method: CheckoutDeliveryMethod;
  optionId: string;
  fee: number;
  estimatedDelivery?: string;
}

// ============================================================
// ADDRESS
// ============================================================

export interface DeliveryAddress {
  id: string;
  label: string; // e.g. "Hostel"
  campusId: string;
  // Campus delivery fields (not every field is mandatory)
  residence?: string; // residence / hostel
  block?: string;
  room?: string;
  pickupPoint?: string;
  instructions?: string;
  contactName: string;
  contactPhone: string;
  isDefault: boolean;
}

// ============================================================
// COUPON (structure only — validation outcome is backend-driven)
// ============================================================

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
  appliedDiscount?: number; // display only; backend authoritative
}

// ============================================================
// KAMPMaX COIN & LOYALTY (readiness only)
// ============================================================

/**
 * Frontend only *displays* a coin toggle + a server-provided balance/amount.
 * The backend determines balance, rate, eligibility, max and applied value.
 */
export interface KampmaxCoinState {
  enabledByBackend: boolean;
  balance: number; // KMC — display only
  useCoin: boolean;
  appliedAmount: number; // Naira — backend authoritative
  remainingBalance: number;
}

export interface LoyaltySectionState {
  enabledByBackend: boolean;
  pointsEarned: number; // estimate shown to the user; backend authoritative
  message?: string;
}

// ============================================================
// PAYMENT
// ============================================================

export type CheckoutPaymentMethod = "paystack" | "wallet";

export type PaymentInitiationState =
  | "idle"
  | "initializing"
  | "pending"
  | "success"
  | "failed"
  | "cancelled"
  | "verification_required";

/**
 * Response shape of a future `POST /checkout/payments/initialize`.
 * The frontend launches the *provider* flow; it never marks the order paid.
 */
export interface PaystackPaymentInitiation {
  reference: string;
  authorizationUrl?: string;
  amount: number;
  currency: "NGN";
  checkoutSessionId: string;
  /** Set when payment has already been initialized for this session. */
  alreadyInitialized?: boolean;
}

export type PaymentVerificationStatus =
  | "successful"
  | "pending"
  | "failed"
  | "cancelled"
  | "verification_required";

export interface PaymentVerificationResult {
  status: PaymentVerificationStatus;
  reference: string;
  message?: string;
}

// ============================================================
// VENDOR ORDER GROUP (multi-vendor parent order)
// ============================================================

export interface CheckoutVendorGroup {
  vendorId: string;
  vendorName: string;
  vendorVerified: boolean;
  items: CartLineItem[];
  subtotal: number; // display only
  deliveryOptions: VendorDeliveryOption[];
  selectedDelivery: VendorDeliverySelection;
  deliveryReady: boolean;
}

// ============================================================
// CHECKOUT SESSION
// ============================================================

export interface CheckoutSessionPricing {
  itemsSubtotal: number;
  deliveryTotal: number;
  discountTotal: number;
  coinDeduction: number;
  finalTotal: number;
  itemCount: number;
}

export interface CheckoutSession {
  sessionId: string;
  customerId?: string;
  campusId: string;
  currency: "NGN";
  itemsSubtotal: number;
  deliveryTotal: number;
  discountTotal: number;
  coinDeduction: number;
  finalTotal: number;
  vendorGroups: CheckoutVendorGroup[];
  pricing: CheckoutSessionPricing;
  expiresAt: string;
  paystackEnabled: boolean;
}

// ============================================================
// CHECKOUT STATE MACHINE
// ============================================================

export const CHECKOUT_STATES = {
  IDLE: "idle",
  LOADING: "loading",
  VALIDATING: "validating",
  READY: "ready",
  PAYMENT_INITIALIZING: "payment_initializing",
  PAYMENT_PENDING: "payment_pending",
  PAYMENT_SUCCESS: "payment_success",
  ORDER_CONFIRMATION: "order_confirmation",
  // Failure / terminal states
  VALIDATION_FAILED: "validation_failed",
  PAYMENT_FAILED: "payment_failed",
  PAYMENT_CANCELLED: "payment_cancelled",
  SESSION_EXPIRED: "session_expired",
  NETWORK_ERROR: "network_error",
} as const;

export type CheckoutState =
  (typeof CHECKOUT_STATES)[keyof typeof CHECKOUT_STATES];

export const CHECKOUT_STATE_LABELS: Record<CheckoutState, string> = {
  idle: "Idle",
  loading: "Loading",
  validating: "Validating your cart…",
  ready: "Ready",
  payment_initializing: "Initializing payment…",
  payment_pending: "Waiting for payment…",
  payment_success: "Payment successful",
  order_confirmation: "Order placed",
  validation_failed: "We couldn't validate your cart.",
  payment_failed: "Payment failed.",
  payment_cancelled: "Payment cancelled.",
  session_expired: "Your checkout session has expired.",
  network_error: "A network error occurred. Please try again.",
};

// ============================================================
// UI / FORM MODEL
// ============================================================

export interface CheckoutCustomer {
  fullName: string;
  email: string;
  phone: string;
}

export interface CheckoutFormData2 {
  customer: CheckoutCustomer;
  campusId: string;
  addressId: string | null; // selected saved address (null = new address)
  newAddress: DeliveryAddress | null; // filled when adding a new address
  perVendorDelivery: Record<string, VendorDeliverySelection>;
  coupon: CouponState;
  useCoin: boolean;
  paymentMethod: CheckoutPaymentMethod;
  agreedToTerms: boolean;
  notes: string;
}

// ============================================================
// ERROR / RESULT
// ============================================================

/** Backend/normalised error, safe to surface (never raw stack/SQL). */
export interface CheckoutErrorInfo {
  code?: string;
  message: string;
  /** Optional reference so user support can trace it (never expose IDs/secrets). */
  reference?: string;
}

export interface CheckoutActionResult<T = void> {
  ok: boolean;
  data?: T;
  error?: CheckoutErrorInfo;
}

export interface CheckoutSessionOptions {
  customerId?: string;
  campusId: string;
  items: CartLineItem[];
}
