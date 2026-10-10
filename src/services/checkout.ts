import type { CartLineItem } from "@/types/cart";
import { getVendorById, getCurrentUser } from "@/services/users";
import { estimateDelivery } from "@/services/cart";
import { checkoutOrdersApi, CheckoutPayload } from "@/services/orders";
import { apiClient, ApiError } from "@/lib/api-client";
import type {
  CheckoutSession,
  CheckoutSessionOptions,
  CheckoutVendorGroup,
  VendorDeliveryOption,
  VendorDeliverySelection,
  CheckoutActionResult,
  CheckoutErrorInfo,
  CouponState,
  CouponCheckoutStatus,
  PaymentVerificationResult,
  DeliveryAddress,
  PaystackPaymentInitiation,
} from "@/types/checkout";

// ============================================================
// BACKEND RESPONSE & DTO TYPES (from NestJS Payments Module)
// ============================================================

export interface InitializePaymentPayload {
  orderId: string;
  /** All orders covered by this charge (multi-vendor checkout), incl. `orderId`. */
  orderIds?: string[];
  amount?: number;
  currency?: string;
  gateway?: "paystack" | "flutterwave";
  callbackUrl?: string;
  metadata?: Record<string, unknown>;
}

export interface BackendPaymentResponse {
  id: string;
  orderId: string;
  /** Every order the payment covers (multi-vendor checkout), incl. `orderId`. */
  orderIds?: string[];
  userId: string;
  reference: string;
  amount: number;
  currency: string;
  status: "PENDING" | "SUCCESS" | "FAILED" | "CANCELLED";
  gateway: string;
  gatewayReference: string | null;
  authorizationUrl: string | null;
  paidAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BackendPaymentDetailResponse extends BackendPaymentResponse {
  gatewayResponse: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  transactions?: Array<{
    id: string;
    type: string;
    gatewayReference: string | null;
    status: string;
    amount: number;
    errorMessage: string | null;
    createdAt: string;
  }>;
}

const CHECKOUT_SESSION_TTL_MS = 30 * 60 * 1000; // 30 minutes

interface CheckoutFeatureFlags {
  couponValidationEnabled: boolean;
  kampmaxCoinEnabled: boolean;
  loyaltyEnabled: boolean;
  paystackEnabled: boolean;
}

const FEATURE_FLAGS: CheckoutFeatureFlags = {
  couponValidationEnabled: true,
  // Loyalty points are earned, never spent on payment.
  kampmaxCoinEnabled: false,
  loyaltyEnabled: true,
  paystackEnabled: true,
};

// ── Error helpers ───────────────────────────────────────────────────────────

function sanitizeError(err: unknown, fallback: string): CheckoutErrorInfo {
  if (err instanceof Error && err.message) {
    return { message: err.message };
  }
  return { message: fallback };
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function makeSessionId(): string {
  return `cs_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function buildVendorDeliveryOptions(vendorId: string): VendorDeliveryOption[] {
  const estimated = estimateDelivery(vendorId);
  return [
    {
      id: `${vendorId}:campus_delivery`,
      method: "campus_delivery",
      label: "Campus Delivery",
      fee: 500,
      estimatedDelivery: estimated,
      state: "available",
    },
    {
      id: `${vendorId}:campus_pickup`,
      method: "campus_pickup",
      label: "Campus Pickup",
      fee: 0,
      estimatedDelivery: "Same day",
      state: "available",
    },
    {
      id: `${vendorId}:vendor_pickup`,
      method: "vendor_pickup",
      label: "Vendor Pickup",
      fee: 0,
      estimatedDelivery: "As agreed with vendor",
      state: "available",
    },
  ];
}

function groupVendorItems(
  items: CartLineItem[]
): { vendorId: string; items: CartLineItem[]; subtotal: number }[] {
  const map = new Map<string, { items: CartLineItem[]; subtotal: number }>();
  for (const item of items) {
    const vid = item.vendorId;
    if (!map.has(vid)) map.set(vid, { items: [], subtotal: 0 });
    const entry = map.get(vid)!;
    entry.items.push(item);
    entry.subtotal += (item.unitPrice ?? item.product.price) * item.quantity;
  }
  return Array.from(map.entries()).map(([vendorId, v]) => ({
    vendorId,
    items: v.items,
    subtotal: v.subtotal,
  }));
}

// ── Public API ────────────────────────────────────────────────────────────

/**
 * Creates presentation session from a live cart.
 */
export function createCheckoutSession(options: CheckoutSessionOptions): CheckoutSession {
  const { items, campusId, customerId } = options;
  const active = items.filter((i) => !i.savedForLater);

  const vendorRaw = groupVendorItems(active);
  const itemsSubtotal = vendorRaw.reduce((s, v) => s + v.subtotal, 0);
  const itemCount = active.reduce((s, i) => s + i.quantity, 0);
  const deliveryTotal = 0;
  const discountTotal = 0;
  const coinDeduction = 0;
  const finalTotal =
    Math.max(0, itemsSubtotal + deliveryTotal - discountTotal - coinDeduction);

  const vendorGroups: CheckoutVendorGroup[] = vendorRaw.map((v) => {
    const vendor = getVendorById(v.vendorId);
    const optionsList = buildVendorDeliveryOptions(v.vendorId);
    const defaultDelivery: VendorDeliverySelection = {
      vendorId: v.vendorId,
      method: "campus_pickup",
      optionId: `${v.vendorId}:campus_pickup`,
      fee: 0,
      estimatedDelivery: "Same day",
    };
    return {
      vendorId: v.vendorId,
      vendorName: vendor?.storeName || "Unknown Vendor",
      vendorVerified: vendor?.verified || false,
      items: v.items,
      subtotal: v.subtotal,
      deliveryOptions: optionsList,
      selectedDelivery: defaultDelivery,
      deliveryReady: true,
    };
  });

  return {
    sessionId: makeSessionId(),
    customerId,
    campusId,
    currency: "NGN",
    itemsSubtotal,
    deliveryTotal,
    discountTotal,
    coinDeduction,
    finalTotal,
    vendorGroups,
    pricing: {
      itemsSubtotal,
      deliveryTotal,
      discountTotal,
      coinDeduction,
      finalTotal,
      itemCount,
    },
    expiresAt: new Date(Date.now() + CHECKOUT_SESSION_TTL_MS).toISOString(),
    paystackEnabled: FEATURE_FLAGS.paystackEnabled,
  };
}

export function getCheckoutSession(session: CheckoutSession): CheckoutSession {
  return {
    ...session,
    expiresAt: new Date(Date.now() + CHECKOUT_SESSION_TTL_MS).toISOString(),
  };
}

export function isCheckoutSessionExpired(session: CheckoutSession): boolean {
  return new Date(session.expiresAt).getTime() < Date.now();
}

/**
 * Validates checkout items before payment.
 */
export async function validateCheckout(
  session: CheckoutSession
): Promise<CheckoutActionResult> {
  if (!session || session.vendorGroups.length === 0) {
    return {
      ok: false,
      error: {
        code: "empty_cart",
        message: "Your cart is empty. Please add items before checking out.",
      },
    };
  }

  return {
    ok: true,
  };
}

interface CouponPreviewResponse {
  code: string;
  totalDiscount: number;
  quotes: {
    vendorId: string;
    applied: boolean;
    discountAmount: number;
    reason?: string;
    promotion?: { id: string; code: string; title: string };
  }[];
}

/** Maps the server's human-readable rejection to the UI's coupon status. */
function couponStatusFromReason(reason: string): CouponState["status"] {
  const r = reason.toLowerCase();
  if (r.includes("expired")) return "expired";
  if (r.includes("spend at least")) return "minimum_not_reached";
  if (r.includes("this store")) return "vendor_specific";
  if (r.includes("does not apply")) return "product_specific";
  if (r.includes("already used") || r.includes("maximum number") || r.includes("usage limit")) {
    return "already_used";
  }
  if (r.includes("not valid")) return "invalid";
  return "not_applicable";
}

/**
 * Prices a promo code against the customer's server-side cart.
 * POST /api/v1/orders/checkout/preview — the server is authoritative; the
 * amount shown here is re-computed when the order is actually placed.
 */
export async function applyCoupon(
  session: CheckoutSession,
  code: string
): Promise<CheckoutActionResult<CouponState>> {
  void session;
  const { data, error } = await apiClient.post<{ promotionCode: string }, CouponPreviewResponse>(
    "/orders/checkout/preview",
    { promotionCode: code }
  );

  if (error || !data) {
    const message = error?.message || "We couldn't check that code. Please try again.";
    return {
      ok: false,
      data: { code, status: "not_applicable", message },
      error: { code: "coupon_unavailable", message },
    };
  }

  if (data.totalDiscount > 0) {
    const applied = data.quotes.find((q) => q.applied)?.promotion;
    return {
      ok: true,
      data: {
        code,
        status: "valid",
        message: applied?.title,
        appliedDiscount: data.totalDiscount,
      },
    };
  }

  const reason = data.quotes.find((q) => q.reason)?.reason ?? "That code can't be applied to this order.";
  return {
    ok: false,
    data: { code, status: couponStatusFromReason(reason), message: reason },
    error: { code: "coupon_rejected", message: reason },
  };
}

export async function removeCoupon(): Promise<CheckoutActionResult<CouponState>> {
  return {
    ok: true,
    data: { code: "", status: "idle" },
  };
}

export async function selectDelivery(
  session: CheckoutSession,
  selection: VendorDeliverySelection
): Promise<CheckoutActionResult<VendorDeliverySelection>> {
  void session;
  return {
    ok: true,
    data: selection,
  };
}

export function getDefaultSelectedDelivery(
  vendorId: string
): VendorDeliverySelection {
  return {
    vendorId,
    method: "campus_pickup",
    optionId: `${vendorId}:campus_pickup`,
    fee: 0,
    estimatedDelivery: "Same day",
  };
}

// ============================================================
// PAYMENTS API METHODS
// ============================================================

/**
 * Initialize payment on the NestJS backend.
 * POST /api/v1/payments/initialize
 */
export async function initializePaymentApi(
  payload: InitializePaymentPayload
): Promise<{ data: BackendPaymentResponse | null; error: ApiError | null }> {
  const { data, error } = await apiClient.post<InitializePaymentPayload, BackendPaymentResponse>(
    "/payments/initialize",
    payload
  );

  if (error || !data || !data.reference) {
    return { data: null, error };
  }

  return { data, error: null };
}

/**
 * Verify payment status with the NestJS backend and Paystack gateway.
 * GET /api/v1/payments/:reference
 */
export async function verifyPaymentApi(
  reference: string,
  force = false
): Promise<{ data: BackendPaymentDetailResponse | null; error: ApiError | null }> {
  const path = `/payments/${encodeURIComponent(reference)}${force ? "?force=true" : ""}`;
  const { data, error } = await apiClient.get<BackendPaymentDetailResponse>(path);

  if (error || !data || !data.reference) {
    return { data: null, error };
  }

  return { data, error: null };
}

/**
 * Initialize Paystack payment for a checkout session / order.
 */
export async function initializePaystackPayment(
  session: CheckoutSession,
  orderIds: string[],
  callbackUrl?: string
): Promise<CheckoutActionResult<PaystackPaymentInitiation>> {
  const [orderId] = orderIds;
  if (!orderId) {
    return {
      ok: false,
      error: {
        code: "missing_order_id",
        message: "An active order ID is required to initialize payment.",
      },
    };
  }

  const { data, error } = await initializePaymentApi({
    orderId,
    orderIds,
    gateway: "paystack",
    callbackUrl,
  });

  if (data && data.reference) {
    return {
      ok: true,
      data: {
        reference: data.reference,
        authorizationUrl: data.authorizationUrl || undefined,
        amount: data.amount,
        currency: "NGN",
        checkoutSessionId: session.sessionId,
      },
    };
  }

  return {
    ok: false,
    error: {
      code: error?.status ? String(error.status) : "payment_init_failed",
      message: error?.message || "Failed to initialize payment gateway with backend.",
    },
  };
}

/**
 * Pay the given orders from the customer's Kampmax Pay wallet. The backend
 * debits the wallet and confirms the orders in one step; a low balance comes
 * back as an error and nothing is charged.
 */
export async function payOrdersWithWallet(
  orderIds: string[]
): Promise<CheckoutActionResult<{ reference: string; orderId: string }>> {
  const [orderId] = orderIds;
  if (!orderId) {
    return {
      ok: false,
      error: {
        code: "missing_order_id",
        message: "An active order ID is required to pay.",
      },
    };
  }

  const { data, error } = await apiClient.post<
    { orderId: string; orderIds: string[] },
    BackendPaymentResponse
  >("/payments/wallet", { orderId, orderIds });

  if (data && data.reference && data.status === "SUCCESS") {
    return { ok: true, data: { reference: data.reference, orderId: data.orderId } };
  }

  return {
    ok: false,
    error: {
      code: error?.status ? String(error.status) : "wallet_payment_failed",
      message: error?.message || "We couldn't complete the wallet payment.",
    },
  };
}

/**
 * Check payment status via backend API verification.
 */
export async function getPaymentStatus(
  reference: string
): Promise<CheckoutActionResult<PaymentVerificationResult>> {
  if (!reference) {
    return {
      ok: false,
      error: { code: "missing_reference", message: "Payment reference is required." },
    };
  }

  const { data, error } = await verifyPaymentApi(reference);

  if (data) {
    const isSuccess = data.status === "SUCCESS";
    const isPending = data.status === "PENDING";
    return {
      ok: isSuccess,
      data: {
        status: isSuccess ? "successful" : isPending ? "pending" : "failed",
        reference,
        message: isSuccess
          ? "Payment verified successfully."
          : isPending
          ? "Payment is pending confirmation."
          : "Payment failed or was cancelled.",
      },
    };
  }

  return {
    ok: false,
    error: {
      code: error?.status ? String(error.status) : "verification_failed",
      message: error?.message || "Payment verification failed or returned invalid status from backend.",
    },
  };
}

// ── Customer / address ──────────────────────────────────────────────────────

export function getCustomerInfo(customerId?: string): {
  fullName: string;
  email: string;
  phone: string;
} {
  const current = customerId ? getCurrentUser() : undefined;
  const user = current && current.id === customerId ? current : undefined;
  return {
    fullName: user?.name || "",
    email: user?.email || "",
    phone: user?.phone || "",
  };
}

export type { DeliveryAddress };

export function checkoutFeatureFlags(): CheckoutFeatureFlags {
  return FEATURE_FLAGS;
}

export function couponStatusLabel(status: CouponCheckoutStatus): string {
  const labels: Record<CouponCheckoutStatus, string> = {
    idle: "",
    loading: "Validating…",
    valid: "Promo code applied.",
    invalid: "This promo code isn't valid.",
    expired: "This promo code has expired.",
    minimum_not_reached:
      "This promo requires a minimum order value that wasn't reached.",
    vendor_specific: "This promo only applies to specific vendors.",
    product_specific: "This promo only applies to specific products.",
    already_used: "This promo code has already been used.",
    not_applicable: "This promo code can't be applied to this order.",
  };
  return labels[status];
}

export function estimateLoyaltyPointsEarned(subtotal: number): number {
  if (!FEATURE_FLAGS.loyaltyEnabled) return 0;
  return Math.round(subtotal * 0.05);
}
