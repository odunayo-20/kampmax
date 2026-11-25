import type { CartLineItem } from "@/types/cart";
import { getVendorById, getCurrentUser } from "@/services/users";
import { apiClient, ApiError } from "@/lib/api-client";
import type {
  CheckoutSummary,
  CheckoutVendorGroup,
  VendorDeliveryOption,
  VendorDeliverySelection,
  VendorDeliveryOffer,
  CheckoutDeliveryMethod,
  CouponState,
  CouponCheckoutStatus,
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

// ── Cart lines ──────────────────────────────────────────────────────────────

export function lineTotal(item: CartLineItem): number {
  return (item.unitPrice ?? item.product.price) * item.quantity;
}

/** The chosen options of a line, e.g. "Size: XL · Colour: Blue". */
export function variantLabelOf(item: CartLineItem): string | undefined {
  if (item.variantLabel) return item.variantLabel;
  if (item.selectedVariation) {
    return `${item.selectedVariation.name}: ${item.selectedVariation.option}`;
  }
  if (!item.selectedVariants) return undefined;
  return Object.entries(item.selectedVariants)
    .map(([k, v]) => `${k}: ${v}`)
    .join(" · ");
}

// ── Delivery ────────────────────────────────────────────────────────────────

export function buildVendorDeliveryOptions(
  vendorId: string,
  offer?: VendorDeliveryOffer
): VendorDeliveryOption[] {
  const pickupState = offer?.pickupAvailable === false ? "unavailable" : "available";
  const pickupMessage = pickupState === "unavailable" ? "This seller doesn't offer pickup" : undefined;
  const deliveryState = offer?.deliveryAvailable ? "available" : "unavailable";
  const deliveryMessage = offer
    ? "This seller doesn't offer delivery"
    : "Delivery details couldn't be loaded";
  return [
    {
      id: `${vendorId}:campus_delivery`,
      method: "campus_delivery",
      label: "Campus Delivery",
      fee: offer?.deliveryFee ?? 0,
      estimatedDelivery: offer ? `Ready in about ${offer.prepTimeMinutes} min` : undefined,
      state: deliveryState,
      message: deliveryState === "unavailable" ? deliveryMessage : undefined,
    },
    {
      id: `${vendorId}:campus_pickup`,
      method: "campus_pickup",
      label: "Campus Pickup",
      fee: 0,
      estimatedDelivery: "Collect on campus",
      state: pickupState,
      message: pickupMessage,
    },
    {
      id: `${vendorId}:vendor_pickup`,
      method: "vendor_pickup",
      label: "Seller Pickup",
      fee: 0,
      estimatedDelivery: offer?.pickupLocation
        ? `Collect at ${offer.pickupLocation}`
        : "The seller will confirm the pickup spot",
      state: pickupState,
      message: pickupMessage,
    },
  ];
}

/** Free pickup is preferred over delivery. */
const DEFAULT_ORDER: CheckoutDeliveryMethod[] = ["campus_pickup", "vendor_pickup", "campus_delivery"];

/** The customer's choice if the seller still offers it, otherwise the default. */
export function pickDelivery(
  vendorId: string,
  options: VendorDeliveryOption[],
  choice?: CheckoutDeliveryMethod
): VendorDeliverySelection | null {
  const opt = (choice ? [choice, ...DEFAULT_ORDER] : DEFAULT_ORDER)
    .map((m) => options.find((o) => o.method === m && o.state === "available"))
    .find(Boolean);
  return opt
    ? { vendorId, method: opt.method, optionId: opt.id, fee: opt.fee, estimatedDelivery: opt.estimatedDelivery }
    : null;
}

// ── Summary ─────────────────────────────────────────────────────────────────

/** Groups the active cart by seller and prices it for display. */
export function buildCheckoutSummary({
  items,
  deliveryOffers,
  choices = {},
  discount = 0,
}: {
  items: CartLineItem[];
  /** Per-vendor offers; a vendor missing here only gets its pickup options. */
  deliveryOffers: Record<string, VendorDeliveryOffer>;
  choices?: Record<string, CheckoutDeliveryMethod>;
  discount?: number;
}): CheckoutSummary {
  const byVendor = new Map<string, CartLineItem[]>();
  for (const item of items) {
    byVendor.set(item.vendorId, [...(byVendor.get(item.vendorId) ?? []), item]);
  }

  const vendorGroups: CheckoutVendorGroup[] = [...byVendor].map(([vendorId, lines]) => {
    const vendor = getVendorById(vendorId);
    const deliveryOptions = buildVendorDeliveryOptions(vendorId, deliveryOffers[vendorId]);
    return {
      vendorId,
      vendorName: vendor?.storeName || "Unknown seller",
      vendorVerified: vendor?.verified || false,
      items: lines,
      subtotal: lines.reduce((sum, line) => sum + lineTotal(line), 0),
      deliveryOptions,
      selectedDelivery: pickDelivery(vendorId, deliveryOptions, choices[vendorId]),
    };
  });

  const itemsSubtotal = vendorGroups.reduce((sum, g) => sum + g.subtotal, 0);
  const deliveryTotal = vendorGroups.reduce((sum, g) => sum + (g.selectedDelivery?.fee ?? 0), 0);

  return {
    vendorGroups,
    pricing: {
      itemsSubtotal,
      deliveryTotal,
      discountTotal: discount,
      // The platform fee is charged to the seller, never to the customer.
      finalTotal: Math.max(0, itemsSubtotal + deliveryTotal - discount),
      itemCount: items.reduce((sum, i) => sum + i.quantity, 0),
    },
  };
}

// ── Promo codes ─────────────────────────────────────────────────────────────

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
export async function applyCoupon(code: string): Promise<CouponState> {
  const { data, error } = await apiClient.post<{ promotionCode: string }, CouponPreviewResponse>(
    "/orders/checkout/preview",
    { promotionCode: code }
  );

  if (error || !data) {
    return { code, status: "not_applicable", message: "We couldn't check that code. Please try again." };
  }

  if (data.totalDiscount > 0) {
    const applied = data.quotes.find((q) => q.applied)?.promotion;
    return { code, status: "valid", message: applied?.title, appliedDiscount: data.totalDiscount };
  }

  const reason = data.quotes.find((q) => q.reason)?.reason ?? "That code can't be applied to this order.";
  return { code, status: couponStatusFromReason(reason), message: reason };
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
    vendor_specific: "This promo only applies to specific sellers.",
    product_specific: "This promo only applies to specific products.",
    already_used: "This promo code has already been used.",
    not_applicable: "This promo code can't be applied to this order.",
  };
  return labels[status];
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

/** Starts one Paystack charge for these orders; `data` is the page to send the customer to. */
export async function startPaystackPayment(
  orderIds: string[],
  callbackUrl: string
): Promise<{ data: string | null; error: ApiError | null }> {
  const { data, error } = await initializePaymentApi({
    orderId: orderIds[0],
    orderIds,
    gateway: "paystack",
    callbackUrl,
  });
  return { data: data?.authorizationUrl || null, error };
}

/**
 * Pay the given orders from the customer's Kampmax Pay wallet. The backend
 * debits the wallet and confirms the orders in one step; a low balance comes
 * back as an error and nothing is charged. `data` is the order to show.
 */
export async function payOrdersWithWallet(
  orderIds: string[]
): Promise<{ data: string | null; error: ApiError | null }> {
  const { data, error } = await apiClient.post<
    { orderId: string; orderIds: string[] },
    BackendPaymentResponse
  >("/payments/wallet", { orderId: orderIds[0], orderIds });

  return { data: !error && data?.status === "SUCCESS" ? data.orderId : null, error };
}

// ── Customer ────────────────────────────────────────────────────────────────

export function getCustomerInfo(customerId: string): {
  fullName: string;
  email: string;
  phone: string;
} {
  const current = getCurrentUser();
  const user = current && current.id === customerId ? current : undefined;
  return {
    fullName: user?.name || "",
    email: user?.email || "",
    phone: user?.phone || "",
  };
}

export function estimateLoyaltyPointsEarned(subtotal: number): number {
  return Math.round(subtotal * 0.05);
}
